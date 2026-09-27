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
});
