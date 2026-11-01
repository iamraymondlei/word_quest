import request from 'supertest';
import app, { initializeDatabaseSchema } from '../src/index';
import pool, { dbConfig } from '../src/config/db';

jest.setTimeout(60000);

describe('Vocabulary Progress & Weak Words Tracking API (TASK-12.1)', () => {
  let testUserId: number;
  let testBookId: number;
  let testWordId1: number;
  let testWordId2: number;

  beforeAll(async () => {
    // Safety verification: test must use TEST_DB_NAME and not DB_NAME
    expect(process.env.NODE_ENV).toBe('test');
    expect(dbConfig.database).not.toBe('wordquest');
    expect(dbConfig.database).toContain('test');

    await initializeDatabaseSchema();

    // 1. Create a dedicated test user
    const [userRes]: any = await pool.query(
      "INSERT INTO users (username, coins, avatar) VALUES ('test_vocab_tracker', 100, '🤖') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)"
    );
    testUserId = userRes.insertId;

    // 2. Create a test word book
    const [bookRes]: any = await pool.query(
      "INSERT INTO word_books (category, title, description) VALUES ('TestCat', 'Test Tracking Book', 'For unit testing')"
    );
    testBookId = bookRes.insertId;

    // 3. Create test vocabulary words
    const [w1Res]: any = await pool.query(
      "INSERT INTO vocabulary_words (book_id, word, phonetic, translation) VALUES (?, 'telescope', '/ˈtelɪskəʊp/', '望远镜')",
      [testBookId]
    );
    testWordId1 = w1Res.insertId;

    const [w2Res]: any = await pool.query(
      "INSERT INTO vocabulary_words (book_id, word, phonetic, translation) VALUES (?, 'microscope', '/ˈmaɪkrəskəʊp/', '显微镜')",
      [testBookId]
    );
    testWordId2 = w2Res.insertId;
  });

  afterAll(async () => {
    if (testUserId) {
      await pool.query('DELETE FROM vocabulary_attempts WHERE user_id = ?', [testUserId]);
      await pool.query('DELETE FROM user_vocabulary_mode_stats WHERE user_id = ?', [testUserId]);
      await pool.query('DELETE FROM user_vocabulary_progress WHERE user_id = ?', [testUserId]);
      await pool.query('DELETE FROM users WHERE id = ?', [testUserId]);
    }
    if (testBookId) {
      await pool.query('DELETE FROM vocabulary_words WHERE book_id = ?', [testBookId]);
      await pool.query('DELETE FROM word_books WHERE id = ?', [testBookId]);
    }
    await pool.end();
  });

  it('should record quiz progress with clientId and update user_vocabulary_mode_stats', async () => {
    const clientId = `test_client_${Date.now()}_1`;

    const res = await request(app)
      .post(`/api/vocabulary-words/${testWordId1}/progress`)
      .send({
        userId: testUserId,
        mode: 'reading',
        passed: true,
        answer: '望远镜',
        durationMs: 3200,
        clientId
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.duplicate).toBe(false);
    expect(res.body.mode_stats.correct_count).toBe(1);
    expect(res.body.mode_stats.streak).toBe(1);
    expect(res.body.mode_stats.error_count).toBe(0);

    // Verify row in vocabulary_attempts table
    const [attempts]: any = await pool.query(
      'SELECT * FROM vocabulary_attempts WHERE client_id = ?',
      [clientId]
    );
    expect(attempts.length).toBe(1);
    expect(attempts[0].answer).toBe('望远镜');
    expect(attempts[0].duration_ms).toBe(3200);
    expect(attempts[0].is_correct).toBe(1);
  });

  it('should detect duplicate submission by clientId and ignore repeated count/coins', async () => {
    const clientId = `test_client_dup_${Date.now()}`;

    // First attempt
    const res1 = await request(app)
      .post(`/api/vocabulary-words/${testWordId1}/progress`)
      .send({
        userId: testUserId,
        mode: 'reading',
        passed: true,
        clientId
      });
    expect(res1.body.duplicate).toBe(false);
    const correctCountBefore = res1.body.mode_stats.correct_count;

    // Duplicate attempt with the same clientId
    const res2 = await request(app)
      .post(`/api/vocabulary-words/${testWordId1}/progress`)
      .send({
        userId: testUserId,
        mode: 'reading',
        passed: true,
        clientId
      });
    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.duplicate).toBe(true);

    // Verify count did not increment in database
    const [stats]: any = await pool.query(
      'SELECT * FROM user_vocabulary_mode_stats WHERE user_id = ? AND vocab_id = ? AND mode = ?',
      [testUserId, testWordId1, 'reading']
    );
    expect(stats[0].correct_count).toBe(correctCountBefore);
  });

  it('should maintain independent stats for different modes (reading vs spelling)', async () => {
    const spellClientId = `test_spell_${Date.now()}`;

    const res = await request(app)
      .post(`/api/vocabulary-words/${testWordId1}/progress`)
      .send({
        userId: testUserId,
        mode: 'spelling',
        passed: false,
        answer: 'telescop',
        clientId: spellClientId
      });

    expect(res.status).toBe(200);
    expect(res.body.mode_stats.error_count).toBe(1);
    expect(res.body.mode_stats.streak).toBe(0);

    // Reading should be unaffected
    const [readingStats]: any = await pool.query(
      'SELECT * FROM user_vocabulary_mode_stats WHERE user_id = ? AND vocab_id = ? AND mode = ?',
      [testUserId, testWordId1, 'reading']
    );
    expect(readingStats[0].error_count).toBe(0);
    expect(readingStats[0].correct_count).toBeGreaterThanOrEqual(1);
  });

  it('should mark mastered when streak reaches 3 consecutive correct passes', async () => {
    // Word 2: pass 3 times in spelling mode
    for (let i = 1; i <= 3; i++) {
      const res = await request(app)
        .post(`/api/vocabulary-words/${testWordId2}/progress`)
        .send({
          userId: testUserId,
          mode: 'spelling',
          passed: true,
          clientId: `streak_test_${Date.now()}_${i}`
        });
      expect(res.body.mode_stats.streak).toBe(i);
      if (i < 3) {
        expect(res.body.mode_stats.mastered).toBe(0);
      } else {
        expect(res.body.mode_stats.mastered).toBe(1);
      }
    }

    // Now fail once: streak resets to 0
    const failRes = await request(app)
      .post(`/api/vocabulary-words/${testWordId2}/progress`)
      .send({
        userId: testUserId,
        mode: 'spelling',
        passed: false,
        clientId: `streak_fail_${Date.now()}`
      });
    expect(failRes.body.mode_stats.streak).toBe(0);
    expect(failRes.body.mode_stats.error_count).toBe(1);
  });

  it('GET /api/users/:userId/vocabulary-stats should return ranked weak words and summary', async () => {
    const res = await request(app).get(`/api/users/${testUserId}/vocabulary-stats?bookId=${testBookId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('summary');
    expect(res.body).toHaveProperty('words');
    expect(Array.isArray(res.body.words)).toBe(true);
    expect(res.body.words.length).toBeGreaterThan(0);

    const firstWord = res.body.words[0];
    expect(firstWord).toHaveProperty('weak_score');
    expect(firstWord).toHaveProperty('error_rate');
    expect(firstWord).toHaveProperty('total_attempts');
    expect(firstWord).toHaveProperty('streak');
  });

  it('GET /api/users/:userId/vocabulary-stats/practice-words should return words for targeted review', async () => {
    const res = await request(app).get(`/api/users/${testUserId}/vocabulary-stats/practice-words?bookId=${testBookId}&limit=5`);

    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(testUserId);
    expect(Array.isArray(res.body.words)).toBe(true);
    expect(res.body.words.length).toBeGreaterThan(0);
    expect(res.body.words[0]).toHaveProperty('word');
  });
});
