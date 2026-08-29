import 'dotenv/config';
import pool from '../src/config/db';

jest.setTimeout(60000);

describe('Database Connection Test', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('should connect to the database and query tables successfully', async () => {
    const [rows] = await pool.query('SHOW TABLES');
    expect(Array.isArray(rows)).toBe(true);
  });
});
