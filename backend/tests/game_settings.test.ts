import request from 'supertest';
import app, { initializeDatabaseSchema } from '../src/index';
import pool from '../src/config/db';

describe('Global Game Settings CRUD (/api/game-settings)', () => {
  beforeAll(async () => {
    await initializeDatabaseSchema();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/game-settings', () => {
    it('should return all default game settings', async () => {
      const res = await request(app).get('/api/game-settings');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('monster_speed_slow');
      expect(res.body).toHaveProperty('monster_speed_medium');
      expect(res.body).toHaveProperty('monster_speed_fast');
      expect(res.body).toHaveProperty('monster_retreat_distance');
      expect(res.body).toHaveProperty('monster_wait_seconds');
      expect(res.body).toHaveProperty('consecutive_error_limit');
      expect(res.body).toHaveProperty('max_lines_per_page');
      expect(res.body).toHaveProperty('initial_hearts');
      expect(res.body).toHaveProperty('coins_completion');
      expect(res.body).toHaveProperty('monster_emojis');
      expect(Array.isArray(res.body.monster_emojis)).toBe(true);
      expect(res.body.monster_emojis.length).toBeGreaterThanOrEqual(1);
      expect(res.body).toHaveProperty('ai_prompt_template');
      expect(typeof res.body.ai_prompt_template).toBe('string');
      expect(res.body.ai_prompt_template.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/game-settings', () => {
    it('should update specific settings including ai_prompt_template and return the updated state', async () => {
      const updates = {
        monster_speed_slow: 1.8,
        monster_wait_seconds: 6,
        coins_completion: 200,
        monster_emojis: ['👾', '🐉', '🤖'],
        ai_prompt_template: 'Custom prompt instructions for test.'
      };

      const res = await request(app).put('/api/game-settings').send(updates);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.settings.monster_speed_slow).toBe(1.8);
      expect(res.body.settings.monster_wait_seconds).toBe(6);
      expect(res.body.settings.coins_completion).toBe(200);
      expect(res.body.settings.monster_emojis).toEqual(['👾', '🐉', '🤖']);
      expect(res.body.settings.ai_prompt_template).toBe('Custom prompt instructions for test.');

      // Verify persistence via GET
      const getRes = await request(app).get('/api/game-settings');
      expect(getRes.status).toBe(200);
      expect(getRes.body.monster_speed_slow).toBe(1.8);
      expect(getRes.body.monster_wait_seconds).toBe(6);
      expect(getRes.body.coins_completion).toBe(200);
      expect(getRes.body.monster_emojis).toEqual(['👾', '🐉', '🤖']);
      expect(getRes.body.ai_prompt_template).toBe('Custom prompt instructions for test.');
    });

    it('should reject empty ai_prompt_template', async () => {
      const res = await request(app).put('/api/game-settings').send({ ai_prompt_template: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/ai_prompt_template/i);
    });

    it('should reject invalid non-object bodies', async () => {
      const res = await request(app).put('/api/game-settings').send([]);
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject invalid monster_emojis (empty array)', async () => {
      const res = await request(app).put('/api/game-settings').send({ monster_emojis: [] });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/monster_emojis/i);
    });

    it('should reject negative numerical values', async () => {
      const res = await request(app).put('/api/game-settings').send({ monster_speed_slow: -2 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/positive number/i);
    });
  });
});
