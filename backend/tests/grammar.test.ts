import 'dotenv/config';
import pool from '../src/config/db';
import express from 'express';
import grammarRoutes from '../src/routes/grammarRoutes';
import request from 'supertest';

jest.setTimeout(60000);

const app = express();
app.use(express.json());
app.use('/api/grammar', grammarRoutes);

describe('Grammar Quiz & Progress API Tests', () => {
  let testUserId: number;

  beforeAll(async () => {
    // Insert a test user
    const [result]: any = await pool.query(
      `INSERT INTO users (username, coins, stars, avatar, is_admin)
       VALUES ('GrammarTestStudent', 0, 0, '🦉', 0)
       ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`
    );
    testUserId = result.insertId;
  });

  afterAll(async () => {
    if (testUserId) {
      await pool.query('DELETE FROM user_grammar_quiz_records WHERE user_id = ?', [testUserId]);
      await pool.query('DELETE FROM users WHERE id = ?', [testUserId]);
    }
    await pool.end();
  });

  it('should get empty progress for fresh user', async () => {
    const res = await request(app).get(`/api/grammar/progress/${testUserId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });

  it('should submit a low score quiz attempt without awarding stars or coins', async () => {
    const res = await request(app)
      .post('/api/grammar/submit')
      .send({
        userId: testUserId,
        category: 'present_simple',
        quizId: 'unit1',
        score: 65,
        totalQuestions: 20,
        correctCount: 13,
        userAnswers: { vt_v1: 'wash' },
        wrongDetails: [{ id: 'v1', base: 'wash', wrongAnswer: 'wash', correctAnswer: 'washes' }],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.score).toBe(65);
    expect(res.body.coinsAwarded).toBe(0);
    expect(res.body.starsAwarded).toBe(0);
    expect(res.body.isFirstPass).toBe(false);
    expect(res.body.user.coins).toBe(0);
    expect(res.body.user.stars).toBe(0);
  });

  it('should submit a passing score (>= 80%) first time and award 50 coins and 1 star', async () => {
    const res = await request(app)
      .post('/api/grammar/submit')
      .send({
        userId: testUserId,
        category: 'present_simple',
        quizId: 'unit1',
        score: 90,
        totalQuestions: 20,
        correctCount: 18,
        userAnswers: { vt_v1: 'washes' },
        wrongDetails: [],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.score).toBe(90);
    expect(res.body.coinsAwarded).toBe(50);
    expect(res.body.starsAwarded).toBe(1);
    expect(res.body.isFirstPass).toBe(true);
    expect(res.body.user.coins).toBe(50);
    expect(res.body.user.stars).toBe(1);
  });

  it('should award 10 coins on repeat passing submission (>= 80%)', async () => {
    const res = await request(app)
      .post('/api/grammar/submit')
      .send({
        userId: testUserId,
        category: 'present_simple',
        quizId: 'unit1',
        score: 95,
        totalQuestions: 20,
        correctCount: 19,
        userAnswers: { vt_v1: 'washes' },
        wrongDetails: [],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.score).toBe(95);
    expect(res.body.coinsAwarded).toBe(10);
    expect(res.body.starsAwarded).toBe(0);
    expect(res.body.isFirstPass).toBe(false);
    expect(res.body.user.coins).toBe(60);
    expect(res.body.user.stars).toBe(1);
  });

  it('should get progress summary with bestScore and latestRecord', async () => {
    const res = await request(app).get(`/api/grammar/progress/${testUserId}`);
    expect(res.status).toBe(200);
    expect(res.body.unit1).toBeDefined();
    expect(res.body.unit1.attemptsCount).toBe(3);
    expect(res.body.unit1.bestScore).toBe(95);
    expect(res.body.unit1.isPassed).toBe(true);
    expect(res.body.unit1.latestRecord.score).toBe(95);
  });

  it('should get all historical attempts in descending order', async () => {
    const res = await request(app).get(`/api/grammar/history/${testUserId}/unit1`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);
    expect(res.body[0].score).toBe(95);
    expect(res.body[1].score).toBe(90);
    expect(res.body[2].score).toBe(65);
  });
});
