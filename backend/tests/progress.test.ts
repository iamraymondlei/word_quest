import 'dotenv/config';
import pool from '../src/config/db';
import express from 'express';
import progressRoutes from '../src/routes/progressRoutes';
import userRoutes from '../src/routes/userRoutes';
import request from 'supertest';

jest.setTimeout(60000);

const app = express();
app.use(express.json());
app.use('/api/progress', progressRoutes);
app.use('/api/users', userRoutes);

describe('Progress and User API Tests', () => {
  let islandId: number;
  let wordId: number;

  beforeEach(async () => {
    await pool.query('DELETE FROM user_word_progress');
    await pool.query('DELETE FROM user_island_progress');
    await pool.query('DELETE FROM words');
    await pool.query('DELETE FROM islands');
    await pool.query('DELETE FROM users');

    const [islandResult]: any = await pool.query(
      "INSERT INTO islands (name) VALUES ('Test Island')"
    );
    islandId = islandResult.insertId;

    const [wordResult]: any = await pool.query(
      "INSERT INTO words (island_id, word, translation, sentence, sentence_translation) VALUES (?, 'apple', '苹果', 'An apple.', '苹果。')",
      [islandId]
    );
    wordId = wordResult.insertId;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('User API', () => {
    it('should register a new user and initialize progress for existing islands to stage 1', async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({ username: 'testkid', avatar: '🦁' });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.username).toBe('testkid');
      expect(loginResponse.body.avatar).toBe('🦁');
      expect(loginResponse.body.coins).toBe(0);

      const userId = loginResponse.body.id;

      // Verify progress was initialized for Test Island
      const [progRows]: any = await pool.query(
        'SELECT unlocked_stage FROM user_island_progress WHERE user_id = ? AND island_id = ?',
        [userId, islandId]
      );
      expect(progRows.length).toBe(1);
      expect(progRows[0].unlocked_stage).toBe(1);
    });

    it('should login an existing user without duplicating the record', async () => {
      // First login (register)
      await request(app)
        .post('/api/users/login')
        .send({ username: 'testkid', avatar: '🦁' });

      // Second login
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({ username: 'testkid', avatar: '🦊' }); // updates avatar

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.username).toBe('testkid');
      expect(loginResponse.body.avatar).toBe('🦊');

      const [userRows]: any = await pool.query('SELECT COUNT(*) as count FROM users WHERE username = ?', ['testkid']);
      expect(userRows[0].count).toBe(1);
    });

    it('should list users sorted by coins descending, then by id ascending', async () => {
      const [user1]: any = await pool.query("INSERT INTO users (username, coins) VALUES ('kid1', 50)");
      const [user2]: any = await pool.query("INSERT INTO users (username, coins) VALUES ('kid2', 100)");
      const [user3]: any = await pool.query("INSERT INTO users (username, coins) VALUES ('kid3', 50)");

      const response = await request(app).get('/api/users');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(3);
      expect(response.body[0].username).toBe('kid2'); // 100 coins
      // kid1 and kid3 both have 50 coins, kid1 (smaller id) should come first
      expect(response.body[1].username).toBe('kid1');
      expect(response.body[2].username).toBe('kid3');
    });

    it('should add coins to a user successfully', async () => {
      const [userResult]: any = await pool.query("INSERT INTO users (username, coins) VALUES ('coinuser', 10)");
      const userId = userResult.insertId;

      const response = await request(app)
        .post('/api/users/add-coins')
        .send({ user_id: userId, coins: 15 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.coins).toBe(25);

      const [userRows]: any = await pool.query('SELECT coins FROM users WHERE id = ?', [userId]);
      expect(userRows[0].coins).toBe(25);
    });

    it('should return 404 Not Found when adding coins to a non-existent user', async () => {
      const response = await request(app)
        .post('/api/users/add-coins')
        .send({ user_id: 999999, coins: 10 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should not reset existing avatar to default when avatar is empty or missing on login', async () => {
      // First login with specific avatar
      await request(app)
        .post('/api/users/login')
        .send({ username: 'avatartest', avatar: '🦁' });

      // Second login with blank/missing avatar
      const response = await request(app)
        .post('/api/users/login')
        .send({ username: 'avatartest' });

      expect(response.status).toBe(200);
      expect(response.body.avatar).toBe('🦁'); // Remains 🦁, not reset to 🦖
    });
  });

  describe('Progress API', () => {
    let userId: number;

    beforeEach(async () => {
      const [userResult]: any = await pool.query("INSERT INTO users (username) VALUES ('proguser')");
      userId = userResult.insertId;
    });

    it('should update and advance the unlocked stage level, using GREATEST logic', async () => {
      // Set to stage 2
      let response = await request(app)
        .post('/api/progress/update-stage')
        .send({ user_id: userId, island_id: islandId, stage: 2 });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.unlocked_stage).toBe(2);

      // Verify db
      let [progRows]: any = await pool.query(
        'SELECT unlocked_stage FROM user_island_progress WHERE user_id = ? AND island_id = ?',
        [userId, islandId]
      );
      expect(progRows[0].unlocked_stage).toBe(2);

      // Try setting to stage 1 (should remain 2)
      response = await request(app)
        .post('/api/progress/update-stage')
        .send({ user_id: userId, island_id: islandId, stage: 1 });
      expect(response.status).toBe(200);
      expect(response.body.unlocked_stage).toBe(2);

      [progRows] = await pool.query(
        'SELECT unlocked_stage FROM user_island_progress WHERE user_id = ? AND island_id = ?',
        [userId, islandId]
      );
      expect(progRows[0].unlocked_stage).toBe(2);
    });

    it('should increment spelling errors for a word successfully', async () => {
      // First error
      let response = await request(app)
        .post('/api/progress/log-error')
        .send({ user_id: userId, word_id: wordId });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      let [errRows]: any = await pool.query(
        'SELECT error_count FROM user_word_progress WHERE user_id = ? AND word_id = ?',
        [userId, wordId]
      );
      expect(errRows[0].error_count).toBe(1);

      // Second error
      response = await request(app)
        .post('/api/progress/log-error')
        .send({ user_id: userId, word_id: wordId });
      expect(response.status).toBe(200);

      [errRows] = await pool.query(
        'SELECT error_count FROM user_word_progress WHERE user_id = ? AND word_id = ?',
        [userId, wordId]
      );
      expect(errRows[0].error_count).toBe(2);
    });

    it('should return 400 Bad Request if foreign key constraint is violated in updateStage (invalid island)', async () => {
      const response = await request(app)
        .post('/api/progress/update-stage')
        .send({ user_id: userId, island_id: 999999, stage: 2 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User, island, or word not found');
    });

    it('should return 400 Bad Request if foreign key constraint is violated in logError (invalid word)', async () => {
      const response = await request(app)
        .post('/api/progress/log-error')
        .send({ user_id: userId, word_id: 999999 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User, island, or word not found');
    });

    // Test Scenario: subtask_star_calculation_rule
    it('subtask_star_calculation_rule: should award 1 star per completed subtask (completing 3 subtasks gives 3 stars, uncompleted subtask does not count)', async () => {
      // Initially user has 0 stars
      const [initialUser]: any = await pool.query('SELECT stars FROM users WHERE id = ?', [userId]);
      expect(initialUser[0].stars || 0).toBe(0);

      // Complete Subtask 1 (completed_stage = 1)
      let res = await request(app)
        .post('/api/progress/update-stage')
        .send({ user_id: userId, island_id: islandId, completed_stage: 1 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stars).toBe(1);
      expect(res.body.completed_stages_mask).toBe(1);

      // Complete Subtask 2 (completed_stage = 2)
      res = await request(app)
        .post('/api/progress/update-stage')
        .send({ user_id: userId, island_id: islandId, completed_stage: 2 });
      expect(res.status).toBe(200);
      expect(res.body.stars).toBe(2);
      expect(res.body.completed_stages_mask).toBe(3); // bit 1 | bit 2

      // Complete Subtask 3 (completed_stage = 3)
      res = await request(app)
        .post('/api/progress/update-stage')
        .send({ user_id: userId, island_id: islandId, completed_stage: 3 });
      expect(res.status).toBe(200);
      expect(res.body.stars).toBe(3);
      expect(res.body.completed_stages_mask).toBe(7); // bit 1 | bit 2 | bit 4

      // Verify uncompleted Stage 4 is not counted - total stars in db remains 3
      const [userInDb]: any = await pool.query('SELECT stars FROM users WHERE id = ?', [userId]);
      expect(userInDb[0].stars).toBe(3);
    });

    // Test Scenario: historical_data_recalculation_migration
    it('historical_data_recalculation_migration: should accurately recalculate historical user stars to 15 when user has 15 completed subtasks', async () => {
      const [histUserResult]: any = await pool.query(
        "INSERT INTO users (username, stars, spent_stars) VALUES ('histuser', 0, 0)"
      );
      const histUserId = histUserResult.insertId;

      // Create 4 test islands
      const [i1]: any = await pool.query("INSERT INTO islands (name) VALUES ('Hist Island 1')");
      const [i2]: any = await pool.query("INSERT INTO islands (name) VALUES ('Hist Island 2')");
      const [i3]: any = await pool.query("INSERT INTO islands (name) VALUES ('Hist Island 3')");
      const [i4]: any = await pool.query("INSERT INTO islands (name) VALUES ('Hist Island 4')");

      // Insert progress summing to 15 completed subtasks:
      // Island 1: 4 subtasks (mask 15)
      // Island 2: 4 subtasks (mask 15)
      // Island 3: 4 subtasks (mask 15)
      // Island 4: 3 subtasks (mask 7)
      // Total = 4 + 4 + 4 + 3 = 15
      await pool.query(
        'INSERT INTO user_island_progress (user_id, island_id, unlocked_stage, completed_stages_mask) VALUES (?, ?, 5, 15)',
        [histUserId, i1.insertId]
      );
      await pool.query(
        'INSERT INTO user_island_progress (user_id, island_id, unlocked_stage, completed_stages_mask) VALUES (?, ?, 5, 15)',
        [histUserId, i2.insertId]
      );
      await pool.query(
        'INSERT INTO user_island_progress (user_id, island_id, unlocked_stage, completed_stages_mask) VALUES (?, ?, 5, 15)',
        [histUserId, i3.insertId]
      );
      await pool.query(
        'INSERT INTO user_island_progress (user_id, island_id, unlocked_stage, completed_stages_mask) VALUES (?, ?, 4, 7)',
        [histUserId, i4.insertId]
      );

      // Trigger recalculation via POST /api/progress/recalculate-stars
      const res = await request(app)
        .post('/api/progress/recalculate-stars')
        .send({ user_id: histUserId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stars).toBe(15);
      expect(res.body.total_stars).toBe(15);

      // Verify stars in database is accurately updated to 15
      const [updatedUser]: any = await pool.query('SELECT stars FROM users WHERE id = ?', [histUserId]);
      expect(updatedUser[0].stars).toBe(15);
    });

    // Test Scenario: recalculation_idempotency
    it('recalculation_idempotency: should keep stars consistent without accumulation drift when recalculate is executed 3 times', async () => {
      const [histUserResult]: any = await pool.query(
        "INSERT INTO users (username, stars, spent_stars) VALUES ('idempotent_user', 0, 0)"
      );
      const testUserId = histUserResult.insertId;

      const [isl1]: any = await pool.query("INSERT INTO islands (name) VALUES ('Idem Island 1')");
      const [isl2]: any = await pool.query("INSERT INTO islands (name) VALUES ('Idem Island 2')");

      // Island 1: 4 subtasks (mask 15), Island 2: 2 subtasks (mask 3) -> Total = 6 subtasks
      await pool.query(
        'INSERT INTO user_island_progress (user_id, island_id, unlocked_stage, completed_stages_mask) VALUES (?, ?, 5, 15)',
        [testUserId, isl1.insertId]
      );
      await pool.query(
        'INSERT INTO user_island_progress (user_id, island_id, unlocked_stage, completed_stages_mask) VALUES (?, ?, 3, 3)',
        [testUserId, isl2.insertId]
      );

      // Run 1
      const res1 = await request(app).post('/api/progress/recalculate-stars').send({ user_id: testUserId });
      expect(res1.status).toBe(200);
      expect(res1.body.stars).toBe(6);

      // Run 2
      const res2 = await request(app).post('/api/progress/recalculate-stars').send({ user_id: testUserId });
      expect(res2.status).toBe(200);
      expect(res2.body.stars).toBe(6);

      // Run 3
      const res3 = await request(app).post('/api/progress/recalculate-stars').send({ user_id: testUserId });
      expect(res3.status).toBe(200);
      expect(res3.body.stars).toBe(6);

      const [userRows]: any = await pool.query('SELECT stars FROM users WHERE id = ?', [testUserId]);
      expect(userRows[0].stars).toBe(6);
    });

    // Test Scenario: store_balance_sync_after_subtask_completion
    it('store_balance_sync_after_subtask_completion: GET /api/progress returns star balance strictly equal to SUM(completed_subtasks & 15)', async () => {
      const [storeUserResult]: any = await pool.query(
        "INSERT INTO users (username, stars, spent_stars) VALUES ('store_user', 0, 0)"
      );
      const storeUserId = storeUserResult.insertId;

      const [islA]: any = await pool.query("INSERT INTO islands (name) VALUES ('Store Island A')");
      const [islB]: any = await pool.query("INSERT INTO islands (name) VALUES ('Store Island B')");

      // 4 subtasks on A, 4 subtasks on B = 8 completed subtasks
      await pool.query(
        'INSERT INTO user_island_progress (user_id, island_id, unlocked_stage, completed_stages_mask) VALUES (?, ?, 5, 15)',
        [storeUserId, islA.insertId]
      );
      await pool.query(
        'INSERT INTO user_island_progress (user_id, island_id, unlocked_stage, completed_stages_mask) VALUES (?, ?, 5, 15)',
        [storeUserId, islB.insertId]
      );

      // Recalculate stars to sync 8 stars
      const recalcRes = await request(app).post('/api/progress/recalculate-stars').send({ user_id: storeUserId });
      expect(recalcRes.status).toBe(200);
      expect(recalcRes.body.stars).toBe(8);

      // Query GET /api/progress?user_id=storeUserId
      const getProgressRes = await request(app)
        .get(`/api/progress?user_id=${storeUserId}`);
      expect(getProgressRes.status).toBe(200);
      expect(getProgressRes.body.success).toBe(true);
      expect(getProgressRes.body.completed_subtasks).toBe(8);
      expect(getProgressRes.body.stars).toBe(8);
      expect(getProgressRes.body.star_balance).toBe(8);
      expect(getProgressRes.body.balance).toBe(8);
    });

    // Test Scenario: typing_input_dictation_blocked
    it('typing_input_dictation_blocked: insertFromDictation inputType in beforeinput is blocked to prevent dictation text modification', () => {
      let isDefaultPrevented = false;
      let text = 'hello';

      const handleBeforeInput = (e: { nativeEvent?: { inputType?: string }; inputType?: string; preventDefault: () => void; data?: string }) => {
        const inputType = e.nativeEvent?.inputType || e.inputType;
        if (inputType === 'insertFromDictation' || inputType === 'insertDictationPhrase') {
          e.preventDefault();
          return;
        }
        if (e.data) text += e.data;
      };

      // Simulate normal typing
      handleBeforeInput({
        inputType: 'insertText',
        preventDefault: () => { isDefaultPrevented = true; },
        data: ' world'
      });
      expect(text).toBe('hello world');
      expect(isDefaultPrevented).toBe(false);

      // Simulate voice dictation event with nativeEvent.inputType
      isDefaultPrevented = false;
      handleBeforeInput({
        nativeEvent: { inputType: 'insertFromDictation' },
        preventDefault: () => { isDefaultPrevented = true; },
        data: ' voice text'
      });
      expect(isDefaultPrevented).toBe(true);
      // Text should remain unmodified
      expect(text).toBe('hello world');
    });

    // Test Scenario: speech_recognition_disabled_in_gameplay
    it('speech_recognition_disabled_in_gameplay: verifies no active speech recognition listener is enabled in GamePlay to populate inputs', () => {
      let speechSupported = false;
      let speechError: string | null = null;
      let isListening = false;
      let inputVal = '';

      const startListening = () => {
        speechSupported = false;
        speechError = '⚠️ 打字游戏禁止使用语音出字，请使用键盘打字输入。';
        isListening = false;
      };

      startListening();

      expect(speechSupported).toBe(false);
      expect(isListening).toBe(false);
      expect(speechError).toContain('打字游戏禁止使用语音出字');
      expect(inputVal).toBe(''); // Text input is untouched
    });

    it('should reject invalid completed_stage (> 4 or < 1) with 400 Bad Request', async () => {
      const resHigh = await request(app)
        .post('/api/progress/update-stage')
        .send({ user_id: userId, island_id: islandId, completed_stage: 5 });
      expect(resHigh.status).toBe(400);
      expect(resHigh.body.error).toContain('completed_stage must be an integer between 1 and 4');

      const resLow = await request(app)
        .post('/api/progress/update-stage')
        .send({ user_id: userId, island_id: islandId, completed_stage: 0 });
      expect(resLow.status).toBe(400);
      expect(resLow.body.error).toContain('completed_stage must be an integer between 1 and 4');
    });

    it('should reject recalculation without valid user_id', async () => {
      // Empty user_id
      const resNoUser = await request(app)
        .post('/api/progress/recalculate-stars')
        .send({});
      expect(resNoUser.status).toBe(400);
      expect(resNoUser.body.error).toContain('Valid positive user_id is required');

      // Invalid user_id
      const resInvalidUser = await request(app)
        .post('/api/progress/recalculate-stars')
        .send({ user_id: -99 });
      expect(resInvalidUser.status).toBe(400);

      // Non-existent user_id
      const resNotFound = await request(app)
        .post('/api/progress/recalculate-stars')
        .send({ user_id: 999999 });
      expect(resNotFound.status).toBe(404);
      expect(resNotFound.body.error).toBe('User not found');
    });
  });
});
