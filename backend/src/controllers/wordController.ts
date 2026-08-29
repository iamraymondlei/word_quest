import { Request, Response } from 'express';
import pool from '../config/db';

// 解析简易的 CSV 内容，支持双引号包裹以处理包含逗号的句子
const parseCSV = (csvText: string): Array<{ word: string; translation: string; sentence: string; sentence_translation: string }> => {
  const lines = csvText.split(/\r?\n/);
  const result = [];
  // 跳过首行 header (word,translation,sentence,sentence_translation)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());

    if (parts.length >= 2) {
      const word = parts[0].trim();
      const translation = parts[1].trim();
      const sentence = (parts[2] || `This is a ${word}.`).trim();
      const sentence_translation = (parts[3] || `这是一个${translation}。`).trim();
      result.push({ word, translation, sentence, sentence_translation });
    }
  }
  return result;
};

export const uploadWords = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const csvContent = req.file.buffer.toString('utf-8');
  const records = parseCSV(csvContent);

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    for (const rec of records) {
      // 写入 words 表并忽略重复项 (或者更新已有)
      const [insertResult]: any = await connection.query(
        `INSERT INTO words (word, translation, sentence, sentence_translation) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE translation = VALUES(translation), sentence = VALUES(sentence), sentence_translation = VALUES(sentence_translation)`,
        [rec.word, rec.translation, rec.sentence, rec.sentence_translation]
      );
      
      const [existingRows]: any = await connection.query('SELECT id FROM words WHERE word = ?', [rec.word]);
      const wordId = insertResult.insertId || (existingRows[0] && existingRows[0].id);

      if (!wordId) {
        throw new Error(`Failed to retrieve or generate ID for word: ${rec.word}`);
      }
      
      // 注意：在新架构中，用户进度是在 user_word_progress 表中管理的
      // 这里不再自动初始化进度，而是由用户首次访问时创建
    }
    await connection.commit();
    res.json({ success: true, message: `Successfully imported ${records.length} words` });
  } catch (err: any) {
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

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
