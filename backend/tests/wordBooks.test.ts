import request from 'supertest';
import app, { initializeDatabaseSchema } from '../src/index';
import pool from '../src/config/db';

jest.setTimeout(60000);

describe('Word Books & Vocabulary Learning API (/api/word-books)', () => {
  let createdBookId: number;
  let createdWordId: number;
  let testUserId: number;

  beforeAll(async () => {
    await initializeDatabaseSchema();

    // Create a temporary test user
    const [userRes]: any = await pool.query(
      "INSERT INTO users (username, coins, avatar) VALUES ('test_vocab_user', 100, '🦖') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)"
    );
    testUserId = userRes.insertId;
  });

  afterAll(async () => {
    if (createdBookId) {
      await pool.query('DELETE FROM word_books WHERE id = ?', [createdBookId]);
    }
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = ?', [testUserId]);
    }
    await pool.end();
  });

  it('GET /api/word-books should list all word books with word count', async () => {
    const res = await request(app).get('/api/word-books');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('title');
    expect(res.body[0]).toHaveProperty('word_count');
  });

  it('POST /api/word-books should reject empty title and create valid book', async () => {
    const invalidRes = await request(app).post('/api/word-books').send({ title: '' });
    expect(invalidRes.status).toBe(400);

    const validRes = await request(app).post('/api/word-books').send({
      category: 'Think',
      title: 'Class 1 Words',
      description: 'Think 1 Chapter 1 vocabulary',
      tags: 'Think,Class1',
      sort_order: 10
    });
    expect(validRes.status).toBe(201);
    expect(validRes.body.category).toBe('Think');
    expect(validRes.body.title).toBe('Class 1 Words');
    createdBookId = validRes.body.id;
  });

  it('PUT /api/word-books/:id should update book info and category', async () => {
    const res = await request(app).put(`/api/word-books/${createdBookId}`).send({
      category: 'Think 1',
      title: 'Class 1 Advanced Words'
    });
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('Think 1');
    expect(res.body.title).toBe('Class 1 Advanced Words');
  });

  it('POST /api/word-books/:id/words should batch import words', async () => {
    const res = await request(app)
      .post(`/api/word-books/${createdBookId}/words`)
      .send({
        words: [
          {
            word: 'sparkle',
            phonetic: '/ˈspɑːk.əl/',
            translation: '闪耀；闪烁',
            fun_sentences: [
              { en: 'The magic crystal sparkles in the midnight sun.', zh: '魔法水晶在午夜的阳光下闪闪发光。' }
            ],
            antonyms: 'dull, fade',
            synonyms: 'glimmer, shine',
            root_affixes: 'spark (火花) + -le (反复动作后缀)',
            etymology: '来自中古英语 sparkelen，意为像微小火花一样不停跳动。'
          },
          {
            word: 'curious',
            phonetic: '/ˈkjʊə.ri.əs/',
            translation: '好奇的',
            fun_sentences: [
              { en: 'The curious robot touched the cake.', zh: '好奇的机器人摸了摸蛋糕。' }
            ],
            antonyms: 'uninterested',
            synonyms: 'inquisitive',
            root_affixes: 'cur- (在意) + -ious',
            etymology: '来自拉丁语 cura 关怀。'
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.inserted_count).toBe(2);
  });

  it('GET /api/word-books/:id/words should return words with progress joined', async () => {
    const res = await request(app).get(`/api/word-books/${createdBookId}/words?userId=${testUserId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);

    const sparkle = res.body.find((w: any) => w.word === 'sparkle');
    expect(sparkle).toBeDefined();
    expect(sparkle.translation).toBe('闪耀；闪烁');
    expect(Array.isArray(sparkle.fun_sentences)).toBe(true);
    expect(sparkle.fun_sentences.length).toBe(1);
    expect(sparkle.reading_passed).toBe(0);

    createdWordId = sparkle.id;
  });

  it('POST /api/vocabulary-words/:id/progress should record quiz progress and award coins', async () => {
    // 1. Reading passed
    const readRes = await request(app)
      .post(`/api/vocabulary-words/${createdWordId}/progress`)
      .send({
        userId: testUserId,
        mode: 'reading',
        passed: true
      });

    expect(readRes.status).toBe(200);
    expect(readRes.body.reading_passed).toBe(1);
    expect(readRes.body.mastered).toBe(0);
    expect(readRes.body.coins_awarded).toBeGreaterThan(0);

    // 2. Listening passed
    const listenRes = await request(app)
      .post(`/api/vocabulary-words/${createdWordId}/progress`)
      .send({
        userId: testUserId,
        mode: 'listening',
        passed: true
      });
    expect(listenRes.body.listening_passed).toBe(1);

    // 3. Spelling passed -> All 3 passed -> mastered = 1
    const spellRes = await request(app)
      .post(`/api/vocabulary-words/${createdWordId}/progress`)
      .send({
        userId: testUserId,
        mode: 'spelling',
        passed: true
      });
    expect(spellRes.body.spelling_passed).toBe(1);
    expect(spellRes.body.mastered).toBe(1);
  });

  it('POST /api/word-books/ai-enrich should return structured word entries', async () => {
    const res = await request(app)
      .post('/api/word-books/ai-enrich')
      .send({
        words: ['brave', 'whisper']
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0]).toHaveProperty('word');
    expect(res.body.data[0]).toHaveProperty('phonetic');
    expect(res.body.data[0]).toHaveProperty('translation');
  });

  it('PUT /api/vocabulary-words/:id with book_id and POST batch-move/batch-delete should work properly', async () => {
    // 1. Create a second word book
    const book2Res = await request(app).post('/api/word-books').send({
      category: 'Think 1',
      title: 'Class 2 Words'
    });
    expect(book2Res.status).toBe(201);
    const book2Id = book2Res.body.id;

    // 2. Move single word to book2Id via PUT
    const moveSingleRes = await request(app)
      .put(`/api/vocabulary-words/${createdWordId}`)
      .send({ book_id: book2Id });
    expect(moveSingleRes.status).toBe(200);
    expect(moveSingleRes.body.book_id).toBe(book2Id);

    // Verify word is now in book2Id
    const book2WordsRes = await request(app).get(`/api/word-books/${book2Id}/words`);
    expect(book2WordsRes.body.some((w: any) => w.id === createdWordId)).toBe(true);

    // 3. Batch move word back to createdBookId
    const batchMoveRes = await request(app)
      .post('/api/vocabulary-words/batch-move')
      .send({
        word_ids: [createdWordId],
        target_book_id: createdBookId
      });
    expect(batchMoveRes.status).toBe(200);
    expect(batchMoveRes.body.success).toBe(true);
    expect(batchMoveRes.body.moved_count).toBe(1);

    // Verify word is back in createdBookId
    const book1WordsRes = await request(app).get(`/api/word-books/${createdBookId}/words`);
    expect(book1WordsRes.body.some((w: any) => w.id === createdWordId)).toBe(true);

    // 4. Batch delete additional test words
    // Insert 2 test words into book2Id
    await request(app).post(`/api/word-books/${book2Id}/words`).send({
      words: [
        { word: 'temp1', translation: '临时1' },
        { word: 'temp2', translation: '临时2' }
      ]
    });
    const tempWordsRes = await request(app).get(`/api/word-books/${book2Id}/words`);
    const tempIds = tempWordsRes.body.map((w: any) => w.id);
    expect(tempIds.length).toBe(2);

    const batchDelRes = await request(app)
      .post('/api/vocabulary-words/batch-delete')
      .send({ word_ids: tempIds });
    expect(batchDelRes.status).toBe(200);
    expect(batchDelRes.body.success).toBe(true);
    expect(batchDelRes.body.deleted_count).toBe(2);

    // Verify book2 is now empty
    const book2EmptyRes = await request(app).get(`/api/word-books/${book2Id}/words`);
    expect(book2EmptyRes.body.length).toBe(0);

    // Clean up second book
    await request(app).delete(`/api/word-books/${book2Id}`);
  });

  it('DELETE /api/vocabulary-words/:id should delete single word', async () => {
    const res = await request(app).delete(`/api/vocabulary-words/${createdWordId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT & GET /api/word-books/:id/access should update and return assigned user IDs', async () => {
    const putRes = await request(app)
      .put(`/api/word-books/${createdBookId}/access`)
      .send({ user_ids: [testUserId] });
    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);
    expect(putRes.body.user_ids).toEqual([testUserId]);

    const getRes = await request(app).get(`/api/word-books/${createdBookId}/access`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.book_id).toBe(createdBookId);
    expect(getRes.body.user_ids).toEqual([testUserId]);
  });

  it('GET /api/word-books should filter books by ownership for students but show all for admin', async () => {
    // Create an Admin and a Student2
    const [adminRes]: any = await pool.query("INSERT INTO users (username, is_admin) VALUES ('admin_user', 1)");
    const [student2Res]: any = await pool.query("INSERT INTO users (username, is_admin) VALUES ('student2_user', 0)");
    const adminId = adminRes.insertId;
    const student2Id = student2Res.insertId;

    try {
      // testUserId has access to createdBookId
      const resUser1 = await request(app).get(`/api/word-books?userId=${testUserId}`);
      expect(resUser1.status).toBe(200);
      const hasCreatedBook1 = resUser1.body.some((b: any) => b.id === createdBookId);
      expect(hasCreatedBook1).toBe(true);

      // student2Id does NOT have access to createdBookId (since it is assigned strictly to testUserId)
      const resUser2 = await request(app).get(`/api/word-books?userId=${student2Id}`);
      expect(resUser2.status).toBe(200);
      const hasCreatedBook2 = resUser2.body.some((b: any) => b.id === createdBookId);
      expect(hasCreatedBook2).toBe(false);

      // Admin has access to all books
      const resAdmin = await request(app).get(`/api/word-books?userId=${adminId}`);
      expect(resAdmin.status).toBe(200);
      const hasCreatedBookAdmin = resAdmin.body.some((b: any) => b.id === createdBookId);
      expect(hasCreatedBookAdmin).toBe(true);
    } finally {
      await pool.query('DELETE FROM users WHERE id IN (?, ?)', [adminId, student2Id]);
    }
  });
});
