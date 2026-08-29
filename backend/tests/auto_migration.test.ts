import 'dotenv/config';
import pool from '../src/config/db';
import { initializeDatabaseSchema } from '../src/index';

jest.setTimeout(60000);

describe('Auto Database Migration', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('should verify schema contains is_admin column, user_island_access table, and Admin user', async () => {
    await initializeDatabaseSchema();

    // Verify is_admin column in users table
    const [cols]: any = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_admin'"
    );
    expect(cols.length).toBeGreaterThan(0);

    // Verify user_island_access table exists
    const [tables]: any = await pool.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_island_access'"
    );
    expect(tables.length).toBeGreaterThan(0);

    // Verify Admin account exists with is_admin = 1
    const [admin]: any = await pool.query(
      "SELECT * FROM users WHERE username = 'Admin' AND is_admin = 1"
    );
    expect(admin.length).toBeGreaterThan(0);

    // Verify group_name column in islands table
    const [groupCols]: any = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'islands' AND COLUMN_NAME = 'group_name'"
    );
    expect(groupCols.length).toBeGreaterThan(0);

    // Verify stars and spent_stars columns in users table
    const [starCols]: any = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'stars'"
    );
    expect(starCols.length).toBeGreaterThan(0);

    const [spentStarCols]: any = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'spent_stars'"
    );
    expect(spentStarCols.length).toBeGreaterThan(0);
  });
});
