import 'dotenv/config';
import pool from '../src/config/db';
import express from 'express';
import userRoutes from '../src/routes/userRoutes';
import islandRoutes from '../src/routes/islandRoutes';
import request from 'supertest';

jest.setTimeout(60000);

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/islands', islandRoutes);

describe('Sector Ownership & Admin Role API', () => {
  beforeAll(async () => {
    // Ensure DB columns & tables exist for test environment
    try {
      await pool.query('ALTER TABLE users ADD COLUMN is_admin TINYINT(1) DEFAULT 0');
    } catch (e) {
      // Column already exists
    }
    try {
      await pool.query("ALTER TABLE islands ADD COLUMN group_name VARCHAR(100) DEFAULT 'General'");
    } catch (e) {
      // Column already exists
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_island_access (
        user_id INT NOT NULL,
        island_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, island_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (island_id) REFERENCES islands(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM user_island_access');
    await pool.query('DELETE FROM user_word_progress');
    await pool.query('DELETE FROM user_island_progress');
    await pool.query('DELETE FROM words');
    await pool.query('DELETE FROM islands');
    await pool.query('DELETE FROM users');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should grant Admin user is_admin=1 on login (case-insensitive)', async () => {
    const resAdmin = await request(app)
      .post('/api/users/login')
      .send({ username: 'Admin', avatar: '👑' });

    expect(resAdmin.status).toBe(200);
    expect(resAdmin.body.username).toBe('Admin');
    expect(resAdmin.body.is_admin).toBe(1);

    const resLowerAdmin = await request(app)
      .post('/api/users/login')
      .send({ username: 'admin', avatar: '👑' });

    expect(resLowerAdmin.status).toBe(200);
    expect(resLowerAdmin.body.is_admin).toBe(1);

    const resRegular = await request(app)
      .post('/api/users/login')
      .send({ username: 'Student1', avatar: '🐱' });

    expect(resRegular.status).toBe(200);
    expect(resRegular.body.username).toBe('Student1');
    expect(resRegular.body.is_admin).toBe(0);
  });

  it('should filter islands based on sector ownership for regular users vs admin', async () => {
    // Create 3 islands
    const [i1]: any = await pool.query("INSERT INTO islands (name, sort_order) VALUES ('Island A', 1)");
    const [i2]: any = await pool.query("INSERT INTO islands (name, sort_order) VALUES ('Island B', 2)");
    const [i3]: any = await pool.query("INSERT INTO islands (name, sort_order) VALUES ('Island C', 3)");

    const islandId1 = i1.insertId;
    const islandId2 = i2.insertId;
    const islandId3 = i3.insertId;

    // Create Admin and 2 Regular Users
    const [adminUser]: any = await pool.query("INSERT INTO users (username, is_admin) VALUES ('Admin', 1)");
    const [user1]: any = await pool.query("INSERT INTO users (username, is_admin) VALUES ('User1', 0)");
    const [user2]: any = await pool.query("INSERT INTO users (username, is_admin) VALUES ('User2', 0)");

    const adminId = adminUser.insertId;
    const userId1 = user1.insertId;
    const userId2 = user2.insertId;

    // Grant User1 access ONLY to Island A (islandId1)
    await pool.query("INSERT INTO user_island_access (user_id, island_id) VALUES (?, ?)", [userId1, islandId1]);

    // 1. User1 should only get Island A
    const resUser1 = await request(app).get(`/api/islands?user_id=${userId1}`);
    expect(resUser1.status).toBe(200);
    expect(resUser1.body.length).toBe(1);
    expect(resUser1.body[0].id).toBe(islandId1);
    expect(resUser1.body[0].assigned_user_ids).toEqual([userId1]);

    // 2. Admin should get all 3 islands
    const resAdmin = await request(app).get(`/api/islands?user_id=${adminId}`);
    expect(resAdmin.status).toBe(200);
    expect(resAdmin.body.length).toBe(3);

    // 3. User2 (with no specific access entries) should fallback to receiving all islands
    const resUser2 = await request(app).get(`/api/islands?user_id=${userId2}`);
    expect(resUser2.status).toBe(200);
    expect(resUser2.body.length).toBe(3);
  });

  it('should update island user access via PUT /api/islands/:id/access', async () => {
    const [i1]: any = await pool.query("INSERT INTO islands (name) VALUES ('Target Island')");
    const islandId = i1.insertId;

    const [user1]: any = await pool.query("INSERT INTO users (username) VALUES ('U1')");
    const [user2]: any = await pool.query("INSERT INTO users (username) VALUES ('U2')");

    const res = await request(app)
      .put(`/api/islands/${islandId}/access`)
      .send({ user_ids: [user1.insertId, user2.insertId] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.island_id).toBe(islandId);
    expect(res.body.user_ids).toEqual([user1.insertId, user2.insertId]);

    const [rows]: any = await pool.query("SELECT user_id FROM user_island_access WHERE island_id = ? ORDER BY user_id ASC", [islandId]);
    expect(rows.length).toBe(2);
    expect(rows.map((r: any) => r.user_id)).toEqual([user1.insertId, user2.insertId].sort((a, b) => a - b));
  });

  it('should delete island and its associated words, progress, and access via DELETE /api/islands/:id', async () => {
    const [i1]: any = await pool.query("INSERT INTO islands (name, group_name) VALUES ('Deletable Island', 'General')");
    const islandId = i1.insertId;

    const [user1]: any = await pool.query("INSERT INTO users (username) VALUES ('TestUserForDelete')");
    const userId = user1.insertId;

    await pool.query("INSERT INTO user_island_access (user_id, island_id) VALUES (?, ?)", [userId, islandId]);
    await pool.query("INSERT INTO user_island_progress (user_id, island_id, unlocked_stage) VALUES (?, ?, 2)", [userId, islandId]);

    const [w1]: any = await pool.query("INSERT INTO words (island_id, word, translation, sentence, sentence_translation) VALUES (?, 'apple', '苹果', 'I eat an apple', '我吃苹果')", [islandId]);
    const wordId = w1.insertId;
    await pool.query("INSERT INTO user_word_progress (user_id, word_id, error_count) VALUES (?, ?, 1)", [userId, wordId]);

    // Perform deletion
    const res = await request(app).delete(`/api/islands/${islandId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify island is gone
    const [islandCheck]: any = await pool.query("SELECT * FROM islands WHERE id = ?", [islandId]);
    expect(islandCheck.length).toBe(0);

    // Verify cascaded records are cleaned up
    const [accessCheck]: any = await pool.query("SELECT * FROM user_island_access WHERE island_id = ?", [islandId]);
    expect(accessCheck.length).toBe(0);

    const [islandProgressCheck]: any = await pool.query("SELECT * FROM user_island_progress WHERE island_id = ?", [islandId]);
    expect(islandProgressCheck.length).toBe(0);

    const [wordsCheck]: any = await pool.query("SELECT * FROM words WHERE island_id = ?", [islandId]);
    expect(wordsCheck.length).toBe(0);

    const [wordProgressCheck]: any = await pool.query("SELECT * FROM user_word_progress WHERE word_id = ?", [wordId]);
    expect(wordProgressCheck.length).toBe(0);

    // Attempting to delete non-existent island returns 404
    const notFoundRes = await request(app).delete(`/api/islands/${islandId}`);
    expect(notFoundRes.status).toBe(404);
  });
});
