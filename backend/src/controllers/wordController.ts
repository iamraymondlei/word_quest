import { Request, Response } from 'express';
import pool from '../config/db';

export const getWords = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT w.id, w.word, w.translation, w.sentence, w.sentence_translation
       FROM words w
       ORDER BY w.id ASC`
    );
    // 格式化输出 - 默认所有进度都为 false
    const result = rows.map((row: any) => ({
      id: row.id,
      word: row.word,
      translation: row.translation,
      sentence: row.sentence,
      sentence_translation: row.sentence_translation,
      progress: {
        listening_passed: false,
        speaking_passed: false,
        reading_passed: false,
        writing_passed: false
      }
    }));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
