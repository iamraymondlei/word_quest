import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import pool from '../config/db';
import { LrcLine, parseLrc } from '../utils/lrcParser';

export interface SongRow {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration_seconds: number | null;
  audio_url: string;
  lrc_text: string | null;
  lrc_source: string | null;
  lrclib_id: number | null;
  match_duration_seconds: number | null;
  status: string;
  segments_json: string | LrcLine[] | null;
  target_words_json?: string | string[] | null;
  translation_json?: string | Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

const SONG_UPLOAD_DIR = path.resolve(process.env.SONG_UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'songs'));

export function ensureSongUploadDir(): void {
  fs.mkdirSync(SONG_UPLOAD_DIR, { recursive: true });
}

function parseSegments(value: SongRow['segments_json']): LrcLine[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseTargetWords(value: SongRow['target_words_json']): string[] {
  if (Array.isArray(value)) return value.filter((word) => typeof word === 'string');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((word) => typeof word === 'string') : [];
    } catch { return []; }
  }
  return [];
}

function parseTranslation(value: SongRow['translation_json']): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') { try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' ? parsed : null; } catch { return null; } }
  return null;
}

function formatSong(row: SongRow): SongRow & { segments: LrcLine[]; targetWords: string[]; translations: Record<string, unknown> | null } {
  return { ...row, segments: parseSegments(row.segments_json), targetWords: parseTargetWords(row.target_words_json), translations: parseTranslation(row.translation_json) };
}

export const translateSong = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM songs WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Song not found' });
    const song = rows[0] as SongRow;
    const sentences = Array.isArray(req.body.sentences) ? req.body.sentences : parseSegments(song.segments_json).map((line) => line.text);
    const requestedWords = Array.isArray(req.body.words) ? req.body.words : parseTargetWords(song.target_words_json);
    const words = requestedWords.length > 0
      ? requestedWords
      : Array.from(new Set(sentences.join(' ').toLowerCase().match(/[a-z][a-z']+/g) || [])).slice(0, 60);
    if (!sentences.length) return res.status(400).json({ error: 'Song has no lyric sentences' });
    const agentUrl = process.env.AI_AGENT_URL || 'http://ai_agent:8000';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 190000);
    try {
      const response = await fetch(`${agentUrl.replace(/\/$/, '')}/translate-song`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sentences, words, model: req.body.model, cli: req.body.cli || 'agy' }), signal: controller.signal });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(response.status >= 500 ? 502 : response.status).json({ error: payload.detail || payload.error || '翻译服务失败' });
      const translations = payload.data;
      await pool.query('UPDATE songs SET translation_json = ? WHERE id = ?', [JSON.stringify(translations), req.params.id]);
      res.json({ song: formatSong({ ...song, translation_json: JSON.stringify(translations) }), translations });
    } finally { clearTimeout(timeout); }
  } catch (error: any) {
    res.status(502).json({ error: error.name === 'AbortError' ? '翻译服务超时' : (error.message || '翻译服务不可用') });
  }
};

async function fetchLrclib(params: Record<string, string | number>): Promise<any | null> {
  const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://lrclib.net/api/get?${query.toString()}`, {
      headers: { 'User-Agent': 'WordQuest/1.0 (song-learning)' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('LRCLIB lookup failed:', error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchLrclib(params: Record<string, string>): Promise<any[]> {
  const query = new URLSearchParams(params);
  try {
    const response = await fetch(`https://lrclib.net/api/search?${query.toString()}`, {
      headers: { 'User-Agent': 'WordQuest/1.0 (song-learning)' },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('LRCLIB search failed:', error instanceof Error ? error.message : error);
    return [];
  }
}

function getUpload(req: Request, name: string): Express.Multer.File | undefined {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  return files?.[name]?.[0];
}

export const getSongs = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM songs ORDER BY updated_at DESC, id DESC');
    res.json(rows.map(formatSong));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch songs' });
  }
};

export const getSong = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM songs WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Song not found' });
    res.json(formatSong(rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch song' });
  }
};

export const createSong = async (req: Request, res: Response) => {
  const audio = getUpload(req, 'audio');
  const lrcFile = getUpload(req, 'lrc');
  if (!audio) return res.status(400).json({ error: 'MP3 audio file is required' });

  const title = String(req.body.title || '').trim();
  const artist = String(req.body.artist || '').trim();
  const album = String(req.body.album || '').trim();
  const duration = Number(req.body.duration);
  if (!title || !artist) return res.status(400).json({ error: 'Title and artist are required' });
  if (!Number.isFinite(duration) || duration <= 0 || duration > 3600) {
    return res.status(400).json({ error: 'A valid audio duration in seconds is required' });
  }

  const providedLrc = lrcFile ? fs.readFileSync(lrcFile.path, 'utf8') : String(req.body.lrc_text || '').trim();
  if (lrcFile) {
    try { fs.unlinkSync(lrcFile.path); } catch { /* temporary LRC upload cleanup is best effort */ }
  }
  let lrcText = providedLrc;
  let lrcSource = providedLrc ? 'manual' : null;
  let lrclibId: number | null = null;
  let matchDuration: number | null = null;
  let candidates: any[] = [];

  if (!lrcText) {
    const match = await fetchLrclib({ track_name: title, artist_name: artist, ...(album ? { album_name: album } : {}), duration: Math.round(duration) });
    if (match?.syncedLyrics) {
      lrcText = match.syncedLyrics;
      lrcSource = 'lrclib';
      lrclibId = Number(match.id) || null;
      matchDuration = Number(match.duration) || null;
    } else {
      candidates = await searchLrclib({ track_name: title, artist_name: artist });
    }
  }

  const segments = lrcText ? parseLrc(lrcText, duration) : [];
  const targetWords = typeof req.body.target_words === 'string'
    ? req.body.target_words.split(',').map((word: string) => word.trim().toLowerCase()).filter(Boolean).slice(0, 20)
    : [];
  if (lrcText && segments.length === 0) return res.status(400).json({ error: 'LRC contains no valid timed lyric lines' });
  ensureSongUploadDir();
  const fileName = path.basename(audio.filename);
  const audioUrl = `/api/songs/audio/${encodeURIComponent(fileName)}`;
  const [result]: any = await pool.query(
    `INSERT INTO songs (title, artist, album, duration_seconds, audio_url, lrc_text, lrc_source, lrclib_id, match_duration_seconds, status, segments_json, target_words_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, artist, album, duration, audioUrl, lrcText || null, lrcSource, lrclibId, matchDuration, lrcText ? 'READY' : 'NEEDS_LYRICS', JSON.stringify(segments), JSON.stringify(targetWords)]
  );
  const [rows]: any = await pool.query('SELECT * FROM songs WHERE id = ?', [result.insertId]);
  res.status(201).json({ song: formatSong(rows[0]), candidates });
};

export const updateSong = async (req: Request, res: Response) => {
  try {
    const [existingRows]: any = await pool.query('SELECT * FROM songs WHERE id = ?', [req.params.id]);
    if (existingRows.length === 0) return res.status(404).json({ error: 'Song not found' });
    const existing = existingRows[0] as SongRow;
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : existing.title;
    const artist = typeof req.body.artist === 'string' ? req.body.artist.trim() : existing.artist;
    const album = typeof req.body.album === 'string' ? req.body.album.trim() : existing.album;
    const lrcText = typeof req.body.lrc_text === 'string' ? req.body.lrc_text : (existing.lrc_text || '');
    const segments = Array.isArray(req.body.segments) ? req.body.segments : parseLrc(lrcText, Number(existing.duration_seconds));
    const targetWords = Array.isArray(req.body.target_words)
      ? req.body.target_words.filter((word: unknown): word is string => typeof word === 'string').map((word: string) => word.trim().toLowerCase()).filter(Boolean).slice(0, 20)
      : parseTargetWords(existing.target_words_json);
    if (!title || !artist || segments.length === 0) return res.status(400).json({ error: 'Title, artist and valid lyrics are required' });

    const lrclibId = req.body.lrclib_id !== undefined && req.body.lrclib_id !== '' ? Number(req.body.lrclib_id) : existing.lrclib_id;
    const matchDuration = req.body.match_duration_seconds !== undefined && req.body.match_duration_seconds !== '' ? Number(req.body.match_duration_seconds) : existing.match_duration_seconds;
    await pool.query(
      `UPDATE songs SET title = ?, artist = ?, album = ?, lrc_text = ?, lrc_source = ?, lrclib_id = ?, match_duration_seconds = ?, status = 'READY', segments_json = ?, target_words_json = ? WHERE id = ?`,
      [title, artist, album, lrcText, req.body.lrc_source || existing.lrc_source || 'manual', lrclibId, matchDuration, JSON.stringify(segments), JSON.stringify(targetWords), req.params.id]
    );
    const [rows]: any = await pool.query('SELECT * FROM songs WHERE id = ?', [req.params.id]);
    res.json(formatSong(rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update song' });
  }
};

export const deleteSong = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query('SELECT audio_url FROM songs WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Song not found' });
    const filename = path.basename(decodeURIComponent(String(rows[0].audio_url).split('/').pop() || ''));
    await pool.query('DELETE FROM songs WHERE id = ?', [req.params.id]);
    if (filename) {
      try { fs.unlinkSync(path.join(SONG_UPLOAD_DIR, filename)); } catch { /* already removed */ }
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete song' });
  }
};

export const getSongAudio = (req: Request, res: Response) => {
  const filename = path.basename(decodeURIComponent(req.params.filename));
  if (!filename || filename !== req.params.filename || filename.includes('..')) return res.status(400).json({ error: 'Invalid audio filename' });
  const filePath = path.join(SONG_UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Audio not found' });
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');
  res.sendFile(filePath);
};

export const parseSongLrc = async (req: Request, res: Response) => {
  const lrc = typeof req.body?.lrc_text === 'string' ? req.body.lrc_text : '';
  const duration = Number(req.body?.duration);
  if (!lrc) return res.status(400).json({ error: 'lrc_text is required' });
  res.json({ segments: parseLrc(lrc, Number.isFinite(duration) ? duration : undefined) });
};
