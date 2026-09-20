import request from 'supertest';
import app, { initializeDatabaseSchema } from '../src/index';
import pool from '../src/config/db';

jest.setTimeout(60000);

describe('Project Roadmap & Changelog API (/api/roadmap)', () => {
  beforeAll(async () => {
    await initializeDatabaseSchema();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/roadmap', () => {
    it('should return all roadmap tasks seeded into the database', async () => {
      const res = await request(app).get('/api/roadmap');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(30);

      const firstItem = res.body[0];
      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('title');
      expect(firstItem).toHaveProperty('category');
      expect(firstItem).toHaveProperty('categoryLabel');
      expect(firstItem).toHaveProperty('status');
      expect(firstItem).toHaveProperty('summary');
      expect(firstItem).toHaveProperty('steps');
      expect(firstItem).toHaveProperty('affectedFiles');
      expect(Array.isArray(firstItem.steps)).toBe(true);
      expect(Array.isArray(firstItem.affectedFiles)).toBe(true);
    });

    it('should include confirmed, evaluating, and discarded tasks with rationale', async () => {
      const res = await request(app).get('/api/roadmap');
      expect(res.status).toBe(200);

      const confirmedItems = res.body.filter((item: any) => item.status === 'CONFIRMED');
      const discardedItems = res.body.filter((item: any) => item.status === 'DISCARDED');
      const evaluatingItems = res.body.filter((item: any) => item.status === 'EVALUATING');

      expect(confirmedItems.length).toBeGreaterThanOrEqual(4);
      expect(discardedItems.length).toBeGreaterThanOrEqual(4);
      expect(evaluatingItems.length).toBeGreaterThanOrEqual(2);

      // Verify discarded item has discardReason
      const discarded = discardedItems[0];
      expect(discarded.discardReason).toBeDefined();
      expect(typeof discarded.discardReason).toBe('string');
      expect(discarded.discardReason.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/roadmap/:id', () => {
    it('should update task status to CONFIRMED and version', async () => {
      const updatePayload = {
        status: 'CONFIRMED',
        version: 'v2.5 (确定排期)',
        priority: 'HIGH'
      };

      const res = await request(app)
        .put('/api/roadmap/FEAT-CONFIRM-01')
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('updated successfully');
      expect(res.body.item.id).toBe('FEAT-CONFIRM-01');
      expect(res.body.item.status).toBe('CONFIRMED');
      expect(res.body.item.version).toBe('v2.5 (确定排期)');

      // Verify persistence via GET
      const getRes = await request(app).get('/api/roadmap');
      const target = getRes.body.find((i: any) => i.id === 'FEAT-CONFIRM-01');
      expect(target).toBeDefined();
      expect(target.status).toBe('CONFIRMED');
    });

    it('should update task status to DISCARDED with custom discard reason and alternative solution', async () => {
      const updatePayload = {
        status: 'DISCARDED',
        discard_reason: '测试舍弃理由：经架构评审不符合离线设计。',
        alternative_solution: '测试替代方案：采用轻量本地模型。'
      };

      const res = await request(app)
        .put('/api/roadmap/FEAT-DISCARD-01')
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.item.status).toBe('DISCARDED');
      expect(res.body.item.discardReason).toBe('测试舍弃理由：经架构评审不符合离线设计。');
      expect(res.body.item.alternativeSolution).toBe('测试替代方案：采用轻量本地模型。');
    });

    it('should reject request when status is missing', async () => {
      const res = await request(app)
        .put('/api/roadmap/FEAT-CONFIRM-01')
        .send({ version: 'v2.8' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status is required/i);
    });

    it('should return 404 when task ID does not exist', async () => {
      const res = await request(app)
        .put('/api/roadmap/NON_EXISTENT_TASK_ID')
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });
});
