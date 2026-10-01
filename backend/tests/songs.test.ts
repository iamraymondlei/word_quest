import fs from 'fs';
import path from 'path';
import request from 'supertest';
import app, { initializeDatabaseSchema } from '../src/index';
import pool from '../src/config/db';

jest.setTimeout(60000);

describe('Song Learning API (/api/songs)', () => {
  let createdId: number;

  beforeAll(async () => {
    await initializeDatabaseSchema();
  });

  afterAll(async () => {
    if (createdId) await request(app).delete(`/api/songs/${createdId}`);
    await pool.end();
  });

  it('uploads an MP3 with LRC, parses sentence intervals, and serves the song', async () => {
    const audioPath = path.resolve(__dirname, '../../docs/mp3/Shake It.mp3');
    const lrcPath = path.resolve(__dirname, '../../docs/mp3/Shake It.lrc');
    expect(fs.existsSync(audioPath)).toBe(true);
    expect(fs.existsSync(lrcPath)).toBe(true);

    const response = await request(app)
      .post('/api/songs')
      .field('title', 'Shake It')
      .field('artist', 'Metro Station')
      .field('album', 'Shake It')
      .field('duration', '180.09')
      .attach('audio', audioPath)
      .attach('lrc', lrcPath);

    expect(response.status).toBe(201);
    expect(response.body.song.status).toBe('READY');
    expect(response.body.song.segments.length).toBeGreaterThan(10);
    expect(response.body.song.segments[0].text).toContain("Let's drop");
    createdId = response.body.song.id;

    const audioResponse = await request(app).get(response.body.song.audio_url);
    expect(audioResponse.status).toBe(200);
    expect(audioResponse.headers['content-type']).toMatch(/audio\/mpeg/);
  });

  it('updates and filters song user access', async () => {
    // 1. Create a dummy user for access testing
    const [userRes]: any = await pool.query(
      "INSERT INTO users (username, is_admin) VALUES ('song_learner_test', 0) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)"
    );
    const testUserId = userRes.insertId;

    // 2. Assign song to this test user
    const putAccessRes = await request(app)
      .put(`/api/songs/${createdId}/access`)
      .send({ user_ids: [testUserId] });
    expect(putAccessRes.status).toBe(200);
    expect(putAccessRes.body.assigned_user_ids).toEqual([testUserId]);

    // 3. Get song access
    const getAccessRes = await request(app).get(`/api/songs/${createdId}/access`);
    expect(getAccessRes.status).toBe(200);
    expect(getAccessRes.body.assigned_user_ids).toEqual([testUserId]);

    // 4. Test filtering by user_id
    // Test user can see it
    const userListRes = await request(app).get(`/api/songs?user_id=${testUserId}`);
    expect(userListRes.status).toBe(200);
    expect(userListRes.body.some((s: any) => s.id === createdId)).toBe(true);

    // Another random user cannot see it
    const otherListRes = await request(app).get('/api/songs?user_id=999999');
    expect(otherListRes.status).toBe(200);
    expect(otherListRes.body.some((s: any) => s.id === createdId)).toBe(false);

    // Reset access to empty (public to all)
    await request(app)
      .put(`/api/songs/${createdId}/access`)
      .send({ user_ids: [] });

    // Clean up test user
    await pool.query('DELETE FROM users WHERE id = ?', [testUserId]);
  });
});
