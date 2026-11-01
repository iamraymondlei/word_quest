import { Request, Response } from 'express';
import pool from '../config/db';

export const getWords = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT w.id, w.word, w.translation, w.fun_sentences_json
       FROM vocabulary_words w
       ORDER BY w.id ASC`
    );
    // 格式化输出 - 默认所有进度都为 false
    const result = rows.map((row: any) => {
      let sentence = '';
      let sentence_translation = '';
      if (row.fun_sentences_json) {
        let parsed = row.fun_sentences_json;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch (e) {}
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          sentence = parsed[0].en || '';
          sentence_translation = parsed[0].zh || '';
        }
      }
      return {
        id: row.id,
        word: row.word,
        translation: row.translation,
        sentence,
        sentence_translation,
        progress: {
          listening_passed: false,
          speaking_passed: false,
          reading_passed: false,
          writing_passed: false
        }
      };
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
