import request from 'supertest';
import app, { initializeDatabaseSchema } from '../src/index';
import pool from '../src/config/db';

const PREFIX = 'GROUP_TEST_';

async function cleanupFixtures() {
  await pool.query('DELETE FROM islands WHERE name LIKE ?', [`${PREFIX}%`]);
  await pool.query('DELETE FROM story_groups WHERE name LIKE ?', [`${PREFIX}%`]);
  await pool.query("INSERT IGNORE INTO story_groups (name) VALUES ('General')");
}

describe('Story Group Management CRUD (/api/groups)', () => {
  beforeAll(async () => {
    await initializeDatabaseSchema();
    await cleanupFixtures();
  });

  beforeEach(async () => {
    await cleanupFixtures();
  });

  afterAll(async () => {
    await cleanupFixtures();
    await pool.end();
  });

  describe('GET /api/groups', () => {
    it('should list story groups including General with story_count', async () => {
      // Create a test island in General
      await pool.query(
        'INSERT INTO islands (name, group_name, story_title) VALUES (?, ?, ?)',
        [`${PREFIX}Island1`, 'General', 'Story 1']
      );

      const res = await request(app).get('/api/groups');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const generalGroup = res.body.find((g: any) => g.name === 'General');
      expect(generalGroup).toBeDefined();
      expect(generalGroup.story_count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /api/groups', () => {
    it('should create a new story group', async () => {
      const groupName = `${PREFIX}Science`;
      const res = await request(app).post('/api/groups').send({ name: groupName });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe(groupName);
      expect(res.body.story_count).toBe(0);

      // Verify in DB
      const [rows]: any = await pool.query('SELECT * FROM story_groups WHERE name = ?', [groupName]);
      expect(rows).toHaveLength(1);
    });

    it('should reject blank group names', async () => {
      const res = await request(app).post('/api/groups').send({ name: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/blank/i);
    });

    it('should reject reserved group name ALL', async () => {
      const res = await request(app).post('/api/groups').send({ name: 'ALL' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/reserved/i);
    });

    it('should reject duplicate group names', async () => {
      const groupName = `${PREFIX}Duplicate`;
      await request(app).post('/api/groups').send({ name: groupName });
      const res = await request(app).post('/api/groups').send({ name: groupName });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already exists/i);
    });
  });

  describe('PUT /api/groups/:id', () => {
    it('should rename a group and cascade update islands', async () => {
      const oldGroupName = `${PREFIX}OldName`;
      const newGroupName = `${PREFIX}NewName`;

      // 1. Create group and island
      const createRes = await request(app).post('/api/groups').send({ name: oldGroupName });
      const groupId = createRes.body.id;

      await pool.query(
        'INSERT INTO islands (name, group_name, story_title) VALUES (?, ?, ?)',
        [`${PREFIX}IslandRename`, oldGroupName, 'Rename Story']
      );

      // 2. Update group name
      const updateRes = await request(app).put(`/api/groups/${groupId}`).send({ name: newGroupName });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.name).toBe(newGroupName);

      // 3. Verify island group_name was cascaded
      const [islands]: any = await pool.query('SELECT group_name FROM islands WHERE name = ?', [`${PREFIX}IslandRename`]);
      expect(islands[0].group_name).toBe(newGroupName);
    });

    it('should forbid renaming General group', async () => {
      const [rows]: any = await pool.query("SELECT id FROM story_groups WHERE name = 'General'");
      const generalId = rows[0].id;

      const res = await request(app).put(`/api/groups/${generalId}`).send({ name: 'SomethingElse' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot be renamed/i);
    });
  });

  describe('DELETE /api/groups/:id', () => {
    it('should delete group and reassign its islands to General', async () => {
      const groupToDelete = `${PREFIX}ToDelete`;
      const createRes = await request(app).post('/api/groups').send({ name: groupToDelete });
      const groupId = createRes.body.id;

      await pool.query(
        'INSERT INTO islands (name, group_name, story_title) VALUES (?, ?, ?)',
        [`${PREFIX}IslandOrphan`, groupToDelete, 'Orphan Story']
      );

      const deleteRes = await request(app).delete(`/api/groups/${groupId}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.reassigned_count).toBe(1);

      // Verify island is now General
      const [islands]: any = await pool.query('SELECT group_name FROM islands WHERE name = ?', [`${PREFIX}IslandOrphan`]);
      expect(islands[0].group_name).toBe('General');

      // Verify group is deleted from story_groups
      const [groups]: any = await pool.query('SELECT * FROM story_groups WHERE id = ?', [groupId]);
      expect(groups).toHaveLength(0);
    });

    it('should forbid deleting General group', async () => {
      const [rows]: any = await pool.query("SELECT id FROM story_groups WHERE name = 'General'");
      const generalId = rows[0].id;

      const res = await request(app).delete(`/api/groups/${generalId}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot be deleted/i);
    });
  });
});
