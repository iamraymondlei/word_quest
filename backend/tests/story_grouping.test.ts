import { initializeDatabaseSchema } from '../src/index';
import pool from '../src/config/db';

const PREFIX = 'REQ000004_MIGRATION_TEST_';

async function deleteFixtures() {
  await pool.query('DELETE FROM islands WHERE name LIKE ?', [`${PREFIX}%`]);
}

describe('Story grouping database compatibility (REQ-000004)', () => {
  beforeEach(async () => {
    await deleteFixtures();
  });

  afterEach(async () => {
    await deleteFixtures();
  });

  afterAll(async () => {
    await deleteFixtures();
    await pool.end();
  });

  it('creates the islands.group_name column with a General default', async () => {
    await initializeDatabaseSchema();

    const [columns]: any = await pool.query(
      `SELECT COLUMN_NAME, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'islands'
         AND COLUMN_NAME = 'group_name'`,
    );

    expect(columns).toHaveLength(1);
    expect(columns[0].COLUMN_NAME).toBe('group_name');
    expect(columns[0].COLUMN_DEFAULT).toBe('General');
  });

  it('normalizes legacy NULL and empty group names to General', async () => {
    await initializeDatabaseSchema();

    await pool.query(
      `INSERT INTO islands (name, group_name, story_title)
       VALUES (?, NULL, ?), (?, '', ?)`,
      [
        `${PREFIX}NULL`,
        'Legacy NULL group',
        `${PREFIX}EMPTY`,
        'Legacy empty group',
      ],
    );

    await initializeDatabaseSchema();

    const [rows]: any = await pool.query(
      `SELECT name, group_name
       FROM islands
       WHERE name LIKE ?
       ORDER BY name ASC`,
      [`${PREFIX}%`],
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row: any) => row.name)).toEqual([
      `${PREFIX}EMPTY`,
      `${PREFIX}NULL`,
    ]);
    expect(rows.every((row: any) => row.group_name === 'General')).toBe(true);
  });
});
