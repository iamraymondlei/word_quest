import 'dotenv/config';
import pool from '../src/config/db';
import express from 'express';
import userRoutes from '../src/routes/userRoutes';
import request from 'supertest';

jest.setTimeout(60000);

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('Admin Login API Tests', () => {
  beforeAll(async () => {
    try {
      await pool.query(
        `INSERT INTO users (username, avatar, is_admin) VALUES ('Admin', '👑', 1)
         ON DUPLICATE KEY UPDATE is_admin = 1`
      );
    } catch {
      // Ignored if DB is mocked or unavailable in isolated unit tests
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should return 400 when username or password is missing', async () => {
    const res1 = await request(app).post('/api/users/admin-login').send({ username: 'admin' });
    expect(res1.status).toBe(400);

    const res2 = await request(app).post('/api/users/admin-login').send({ password: 'admin' });
    expect(res2.status).toBe(400);
  });

  it('should return 401 for incorrect credentials', async () => {
    const res1 = await request(app).post('/api/users/admin-login').send({ username: 'admin', password: 'wrongpassword' });
    expect(res1.status).toBe(401);

    const res2 = await request(app).post('/api/users/admin-login').send({ username: 'notadmin', password: 'admin' });
    expect(res2.status).toBe(401);
  });

  it('should return 200 and admin user for valid admin:admin credentials', async () => {
    const res = await request(app).post('/api/users/admin-login').send({ username: 'admin', password: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe('Admin');
    expect(res.body.user.is_admin).toBe(1);
    expect(res.body.user.password).toBeUndefined();
  });

  it('should validate and change password', async () => {
    // 1. Missing fields
    const res1 = await request(app).post('/api/users/change-password').send({ user_id: 1 });
    expect(res1.status).toBe(400);

    // 2. Too short password
    const res2 = await request(app).post('/api/users/change-password').send({ user_id: 1, old_password: 'admin', new_password: 'ab' });
    expect(res2.status).toBe(400);

    // 3. Wrong old password
    const res3 = await request(app).post('/api/users/change-password').send({ user_id: 1, old_password: 'wrong', new_password: 'newadmin123' });
    expect(res3.status).toBe(401);

    // 4. Successful password change
    const res4 = await request(app).post('/api/users/change-password').send({ user_id: 1, old_password: 'admin', new_password: 'newadmin123' });
    expect(res4.status).toBe(200);
    expect(res4.body.success).toBe(true);

    // 5. Verify admin login with old password fails
    const resOld = await request(app).post('/api/users/admin-login').send({ username: 'admin', password: 'admin' });
    expect(resOld.status).toBe(401);

    // 6. Verify admin login with new password succeeds
    const resNew = await request(app).post('/api/users/admin-login').send({ username: 'admin', password: 'newadmin123' });
    expect(resNew.status).toBe(200);
    expect(resNew.body.success).toBe(true);

    // 7. Reset password back to 'admin' for subsequent test runs
    await request(app).post('/api/users/change-password').send({ user_id: 1, old_password: 'newadmin123', new_password: 'admin' });
  });
});
