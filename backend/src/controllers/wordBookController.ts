import { Request, Response } from 'express';
import pool from '../config/db';

export interface SentenceItem {
  en: string;
  zh: string;
}

export interface VocabularyWordInput {
  word: string;
  phonetic?: string;
  translation: string;
  fun_sentences?: SentenceItem[];
  fun_sentences_json?: string | SentenceItem[];
  antonyms?: string;
  synonyms?: string;
  root_affixes?: string | any;
  etymology?: string | any;
}

/**
 * Helper to safely parse JSON sentences into array
 */
function parseFunSentences(val: any): SentenceItem[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * GET /api/word-books
 * List all word books with word count and optional user progress
 */
export const getWordBooks = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : null;

    let isAdmin = false;
    if (userId) {
      const [userRows]: any = await pool.query('SELECT username, is_admin FROM users WHERE id = ?', [userId]);
      if (userRows.length > 0) {
        const u = userRows[0];
        if (u.is_admin === 1 || (u.username && u.username.toLowerCase() === 'admin')) {
          isAdmin = true;
        }
      }
    }

    let query = '';
    let params: any[] = [];

    if (userId) {
      if (isAdmin) {
        query = `
          SELECT b.id, b.category, b.title, b.description, b.tags, b.sort_order, b.created_at, b.updated_at,
                 COUNT(w.id) as word_count,
                 COUNT(CASE WHEN p.mastered = 1 THEN 1 END) as mastered_count,
                 COUNT(CASE WHEN (p.reading_passed = 1 OR p.listening_passed = 1 OR p.spelling_passed = 1) THEN 1 END) as started_count
          FROM word_books b
          LEFT JOIN vocabulary_words w ON b.id = w.book_id
          LEFT JOIN user_vocabulary_progress p ON w.id = p.vocab_id AND p.user_id = ?
          GROUP BY b.id
          ORDER BY b.category ASC, b.sort_order ASC, b.id ASC
        `;
        params = [userId];
      } else {
        query = `
          SELECT b.id, b.category, b.title, b.description, b.tags, b.sort_order, b.created_at, b.updated_at,
                 COUNT(w.id) as word_count,
                 COUNT(CASE WHEN p.mastered = 1 THEN 1 END) as mastered_count,
                 COUNT(CASE WHEN (p.reading_passed = 1 OR p.listening_passed = 1 OR p.spelling_passed = 1) THEN 1 END) as started_count
          FROM word_books b
          LEFT JOIN vocabulary_words w ON b.id = w.book_id
          LEFT JOIN user_vocabulary_progress p ON w.id = p.vocab_id AND p.user_id = ?
          WHERE (
            b.id NOT IN (SELECT book_id FROM user_word_book_access)
            OR b.id IN (SELECT book_id FROM user_word_book_access WHERE user_id = ?)
          )
          GROUP BY b.id
          ORDER BY b.category ASC, b.sort_order ASC, b.id ASC
        `;
        params = [userId, userId];
      }
    } else {
      query = `
        SELECT b.id, b.category, b.title, b.description, b.tags, b.sort_order, b.created_at, b.updated_at,
               COUNT(w.id) as word_count,
               0 as mastered_count,
               0 as started_count
        FROM word_books b
        LEFT JOIN vocabulary_words w ON b.id = w.book_id
        GROUP BY b.id
        ORDER BY b.category ASC, b.sort_order ASC, b.id ASC
      `;
    }

    const [rows]: any = await pool.query(query, params);

    // Fetch assigned user IDs for returned books
    if (rows.length > 0) {
      const bookIds = rows.map((b: any) => b.id);
      const [accessMapRows]: any = await pool.query(
        'SELECT book_id, user_id FROM user_word_book_access WHERE book_id IN (?)',
        [bookIds]
      );
      const accessMap: Record<number, number[]> = {};
      for (const r of accessMapRows) {
        if (!accessMap[r.book_id]) {
          accessMap[r.book_id] = [];
        }
        accessMap[r.book_id].push(r.user_id);
      }
      for (const b of rows) {
        b.assigned_user_ids = accessMap[b.id] || [];
      }
    }

    res.json(rows);
  } catch (err: any) {
    console.error('getWordBooks error:', err.message);
    res.status(500).json({ error: 'Failed to fetch word books' });
  }
};

/**
 * GET /api/word-books/:id/access
 * Get assigned user IDs for a word book
 */
export const getWordBookAccess = async (req: Request, res: Response) => {
  try {
    const bookId = Number(req.params.id);
    if (isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid word book ID' });
    }
    const [books]: any = await pool.query('SELECT id FROM word_books WHERE id = ?', [bookId]);
    if (books.length === 0) {
      return res.status(404).json({ error: 'Word book not found' });
    }

    const [rows]: any = await pool.query(
      'SELECT user_id FROM user_word_book_access WHERE book_id = ? ORDER BY user_id ASC',
      [bookId]
    );
    const userIds = rows.map((r: any) => r.user_id);
    res.json({ book_id: bookId, user_ids: userIds });
  } catch (err: any) {
    console.error('getWordBookAccess error:', err.message);
    res.status(500).json({ error: 'Failed to fetch word book access' });
  }
};

/**
 * PUT /api/word-books/:id/access
 * Update assigned user IDs for a word book
 */
export const updateWordBookAccess = async (req: Request, res: Response) => {
  const bookId = Number(req.params.id);
  const { user_ids } = req.body;
  if (isNaN(bookId)) {
    return res.status(400).json({ error: 'Invalid word book ID' });
  }
  if (!Array.isArray(user_ids)) {
    return res.status(400).json({ error: 'user_ids must be an array' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [books]: any = await connection.query('SELECT id FROM word_books WHERE id = ?', [bookId]);
    if (books.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Word book not found' });
    }

    await connection.query('DELETE FROM user_word_book_access WHERE book_id = ?', [bookId]);

    for (const uid of user_ids) {
      await connection.query(
        'INSERT IGNORE INTO user_word_book_access (user_id, book_id) VALUES (?, ?)',
        [uid, bookId]
      );
    }

    await connection.commit();
    res.json({ success: true, book_id: bookId, user_ids });
  } catch (err: any) {
    if (connection) await connection.rollback();
    console.error('updateWordBookAccess error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to update word book access' });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * POST /api/word-books
 * Create a new word book
 */
export const createWordBook = async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const { category, title, description, tags, sort_order, user_ids } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      connection.release();
      return res.status(400).json({ error: 'Word book title is required' });
    }

    const bookCategory = category && typeof category === 'string' && category.trim() ? category.trim() : 'General';

    await connection.beginTransaction();

    const [result]: any = await connection.query(
      'INSERT INTO word_books (category, title, description, tags, sort_order) VALUES (?, ?, ?, ?, ?)',
      [bookCategory, title.trim(), description || '', tags || '', sort_order || 0]
    );

    const newBookId = result.insertId;

    if (Array.isArray(user_ids) && user_ids.length > 0) {
      for (const uid of user_ids) {
        await connection.query(
          'INSERT IGNORE INTO user_word_book_access (user_id, book_id) VALUES (?, ?)',
          [uid, newBookId]
        );
      }
    }

    await connection.commit();

    const [rows]: any = await pool.query('SELECT * FROM word_books WHERE id = ?', [newBookId]);
    const book = rows[0];
    book.assigned_user_ids = Array.isArray(user_ids) ? user_ids : [];
    res.status(201).json(book);
  } catch (err: any) {
    await connection.rollback();
    console.error('createWordBook error:', err.message);
    res.status(500).json({ error: 'Failed to create word book' });
  } finally {
    connection.release();
  }
};

/**
 * PUT /api/word-books/:id
 * Update word book metadata
 */
export const updateWordBook = async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { category, title, description, tags, sort_order, user_ids } = req.body;

    const [existing]: any = await connection.query('SELECT * FROM word_books WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Word book not found' });
    }

    await connection.beginTransaction();

    await connection.query(
      `UPDATE word_books
       SET category = COALESCE(?, category),
           title = COALESCE(?, title),
           description = COALESCE(?, description),
           tags = COALESCE(?, tags),
           sort_order = COALESCE(?, sort_order)
       WHERE id = ?`,
      [
        category !== undefined ? (category.trim() || 'General') : null,
        title !== undefined ? title.trim() : null,
        description !== undefined ? description : null,
        tags !== undefined ? tags : null,
        sort_order !== undefined ? sort_order : null,
        id
      ]
    );

    if (Array.isArray(user_ids)) {
      await connection.query('DELETE FROM user_word_book_access WHERE book_id = ?', [id]);
      for (const uid of user_ids) {
        await connection.query(
          'INSERT IGNORE INTO user_word_book_access (user_id, book_id) VALUES (?, ?)',
          [uid, id]
        );
      }
    }

    await connection.commit();

    const [updated]: any = await pool.query('SELECT * FROM word_books WHERE id = ?', [id]);
    const [accessRows]: any = await pool.query(
      'SELECT user_id FROM user_word_book_access WHERE book_id = ?',
      [id]
    );
    const book = updated[0];
    book.assigned_user_ids = accessRows.map((r: any) => r.user_id);

    res.json(book);
  } catch (err: any) {
    await connection.rollback();
    console.error('updateWordBook error:', err.message);
    res.status(500).json({ error: 'Failed to update word book' });
  } finally {
    connection.release();
  }
};

/**
 * DELETE /api/word-books/:id
 * Delete word book and cascade
 */
export const deleteWordBook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM user_word_book_access WHERE book_id = ?', [id]);
    const [result]: any = await pool.query('DELETE FROM word_books WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Word book not found' });
    }
    res.json({ success: true, message: 'Word book deleted successfully' });
  } catch (err: any) {
    console.error('deleteWordBook error:', err.message);
    res.status(500).json({ error: 'Failed to delete word book' });
  }
};

/**
 * GET /api/word-books/:id/words
 * Get all vocabulary words in a book with user progress
 */
export const getBookWords = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId ? Number(req.query.userId) : null;

    let query = '';
    let params: any[] = [];

    if (userId) {
      query = `
        SELECT w.*,
               COALESCE(p.error_count, 0) as error_count,
               COALESCE(p.mastered, 0) as mastered,
               COALESCE(p.reading_passed, 0) as reading_passed,
               COALESCE(p.listening_passed, 0) as listening_passed,
               COALESCE(p.spelling_passed, 0) as spelling_passed
        FROM vocabulary_words w
        LEFT JOIN user_vocabulary_progress p ON w.id = p.vocab_id AND p.user_id = ?
        WHERE w.book_id = ?
        ORDER BY w.id ASC
      `;
      params = [userId, id];
    } else {
      query = `
        SELECT w.*,
               0 as error_count,
               0 as mastered,
               0 as reading_passed,
               0 as listening_passed,
               0 as spelling_passed
        FROM vocabulary_words w
        WHERE w.book_id = ?
        ORDER BY w.id ASC
      `;
      params = [id];
    }

    const [rows]: any = await pool.query(query, params);
    const words = rows.map((r: any) => ({
      ...r,
      fun_sentences: parseFunSentences(r.fun_sentences_json)
    }));

    res.json(words);
  } catch (err: any) {
    console.error('getBookWords error:', err.message);
    res.status(500).json({ error: 'Failed to fetch words for book' });
  }
};

/**
 * POST /api/word-books/:id/words
 * Batch add or import words to a word book
 */
export const addWordsToBook = async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { words } = req.body;

    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: 'Words array is required and must not be empty' });
    }

    // Verify book exists
    const [bookRows]: any = await connection.query('SELECT id FROM word_books WHERE id = ?', [id]);
    if (!bookRows || bookRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Word book not found' });
    }

    await connection.beginTransaction();

    const insertedIds: number[] = [];

    for (const item of words) {
      if (!item.word || !item.translation) continue;

      const word = String(item.word).trim().toLowerCase();
      const phonetic = item.phonetic ? String(item.phonetic).trim() : '';
      const translation = String(item.translation).trim();
      const funSentences = item.fun_sentences || parseFunSentences(item.fun_sentences_json);
      const funSentencesJson = JSON.stringify(funSentences);
      const antonyms = item.antonyms ? String(item.antonyms).trim() : '';
      const synonyms = item.synonyms ? String(item.synonyms).trim() : '';
      const rootAffixes = item.root_affixes
        ? (typeof item.root_affixes === 'object' ? JSON.stringify(item.root_affixes) : String(item.root_affixes).trim())
        : '';
      const etymology = item.etymology
        ? (typeof item.etymology === 'object' ? JSON.stringify(item.etymology) : String(item.etymology).trim())
        : '';

      const [res]: any = await connection.query(
        `INSERT INTO vocabulary_words
         (book_id, word, phonetic, translation, fun_sentences_json, antonyms, synonyms, root_affixes, etymology)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, word, phonetic, translation, funSentencesJson, antonyms, synonyms, rootAffixes, etymology]
      );
      insertedIds.push(res.insertId);
    }

    await connection.commit();
    res.status(201).json({
      success: true,
      message: `Successfully imported ${insertedIds.length} words`,
      inserted_count: insertedIds.length
    });
  } catch (err: any) {
    await connection.rollback();
    console.error('addWordsToBook error:', err.message);
    res.status(500).json({ error: 'Failed to import words into book' });
  } finally {
    connection.release();
  }
};

/**
 * PUT /api/vocabulary-words/:id
 * Edit single vocabulary word
 */
export const updateVocabularyWord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { book_id, word, phonetic, translation, fun_sentences, antonyms, synonyms, root_affixes, etymology } = req.body;

    if (book_id !== undefined) {
      const targetBookId = Number(book_id);
      if (isNaN(targetBookId) || targetBookId <= 0) {
        return res.status(400).json({ error: 'Invalid target book_id' });
      }
      const [bookCheck]: any = await pool.query('SELECT id FROM word_books WHERE id = ?', [targetBookId]);
      if (!bookCheck || bookCheck.length === 0) {
        return res.status(404).json({ error: 'Target word book not found' });
      }
    }

    const funSentencesJson = fun_sentences !== undefined ? JSON.stringify(parseFunSentences(fun_sentences)) : null;

    await pool.query(
      `UPDATE vocabulary_words
       SET book_id = COALESCE(?, book_id),
           word = COALESCE(?, word),
           phonetic = COALESCE(?, phonetic),
           translation = COALESCE(?, translation),
           fun_sentences_json = COALESCE(?, fun_sentences_json),
           antonyms = COALESCE(?, antonyms),
           synonyms = COALESCE(?, synonyms),
           root_affixes = COALESCE(?, root_affixes),
           etymology = COALESCE(?, etymology)
       WHERE id = ?`,
      [
        book_id !== undefined ? Number(book_id) : null,
        word ? String(word).trim().toLowerCase() : null,
        phonetic !== undefined ? String(phonetic).trim() : null,
        translation ? String(translation).trim() : null,
        funSentencesJson,
        antonyms !== undefined ? String(antonyms).trim() : null,
        synonyms !== undefined ? String(synonyms).trim() : null,
        root_affixes !== undefined
          ? (typeof root_affixes === 'object' && root_affixes !== null ? JSON.stringify(root_affixes) : String(root_affixes).trim())
          : null,
        etymology !== undefined
          ? (typeof etymology === 'object' && etymology !== null ? JSON.stringify(etymology) : String(etymology).trim())
          : null,
        id
      ]
    );

    const [rows]: any = await pool.query('SELECT * FROM vocabulary_words WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Vocabulary word not found' });
    }

    res.json({
      ...rows[0],
      fun_sentences: parseFunSentences(rows[0].fun_sentences_json)
    });
  } catch (err: any) {
    console.error('updateVocabularyWord error:', err.message);
    res.status(500).json({ error: 'Failed to update vocabulary word' });
  }
};

/**
 * POST /api/vocabulary-words/batch-move
 * Move multiple vocabulary words to another word book / chapter
 */
export const batchMoveVocabularyWords = async (req: Request, res: Response) => {
  try {
    const { word_ids, target_book_id } = req.body;

    if (!Array.isArray(word_ids) || word_ids.length === 0) {
      return res.status(400).json({ error: 'word_ids must be a non-empty array of numbers' });
    }

    const cleanWordIds = word_ids.map(Number).filter((id) => !isNaN(id) && id > 0);
    if (cleanWordIds.length === 0) {
      return res.status(400).json({ error: 'No valid word IDs provided' });
    }

    const targetBookId = Number(target_book_id);
    if (isNaN(targetBookId) || targetBookId <= 0) {
      return res.status(400).json({ error: 'Valid target_book_id is required' });
    }

    // Verify target book exists
    const [bookRows]: any = await pool.query('SELECT id, title, category FROM word_books WHERE id = ?', [targetBookId]);
    if (!bookRows || bookRows.length === 0) {
      return res.status(404).json({ error: 'Target word book not found' });
    }

    const [result]: any = await pool.query(
      'UPDATE vocabulary_words SET book_id = ? WHERE id IN (?)',
      [targetBookId, cleanWordIds]
    );

    res.json({
      success: true,
      message: `成功移动 ${result.affectedRows} 个单词至《${bookRows[0].category || 'General'} · ${bookRows[0].title}》`,
      moved_count: result.affectedRows,
      target_book_id: targetBookId
    });
  } catch (err: any) {
    console.error('batchMoveVocabularyWords error:', err.message);
    res.status(500).json({ error: 'Failed to batch move vocabulary words' });
  }
};

/**
 * POST /api/vocabulary-words/batch-delete
 * Delete multiple vocabulary words and their user progress
 */
export const batchDeleteVocabularyWords = async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const { word_ids } = req.body;

    if (!Array.isArray(word_ids) || word_ids.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'word_ids must be a non-empty array of numbers' });
    }

    const cleanWordIds = word_ids.map(Number).filter((id) => !isNaN(id) && id > 0);
    if (cleanWordIds.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'No valid word IDs provided' });
    }

    await connection.beginTransaction();

    await connection.query('DELETE FROM user_vocabulary_progress WHERE vocab_id IN (?)', [cleanWordIds]);
    const [result]: any = await connection.query('DELETE FROM vocabulary_words WHERE id IN (?)', [cleanWordIds]);

    await connection.commit();

    res.json({
      success: true,
      message: `成功批量删除 ${result.affectedRows} 个单词`,
      deleted_count: result.affectedRows
    });
  } catch (err: any) {
    await connection.rollback();
    console.error('batchDeleteVocabularyWords error:', err.message);
    res.status(500).json({ error: 'Failed to batch delete vocabulary words' });
  } finally {
    connection.release();
  }
};

/**
 * DELETE /api/vocabulary-words/:id
 * Delete single vocabulary word
 */
export const deleteVocabularyWord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [result]: any = await pool.query('DELETE FROM vocabulary_words WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Vocabulary word not found' });
    }
    res.json({ success: true, message: 'Word deleted successfully' });
  } catch (err: any) {
    console.error('deleteVocabularyWord error:', err.message);
    res.status(500).json({ error: 'Failed to delete vocabulary word' });
  }
};

/**
 * POST /api/vocabulary-words/:id/progress
 * Record quiz / game result for a student
 */
export const recordWordProgress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, mode, passed, errorIncrement } = req.body;

    if (!userId || !mode) {
      return res.status(400).json({ error: 'userId and mode (reading | listening | spelling) are required' });
    }

    // Get existing progress
    const [rows]: any = await pool.query(
      'SELECT * FROM user_vocabulary_progress WHERE user_id = ? AND vocab_id = ?',
      [userId, id]
    );

    let readingPassed = 0;
    let listeningPassed = 0;
    let spellingPassed = 0;
    let errorCount = 0;

    if (rows && rows.length > 0) {
      readingPassed = rows[0].reading_passed;
      listeningPassed = rows[0].listening_passed;
      spellingPassed = rows[0].spelling_passed;
      errorCount = rows[0].error_count;
    }

    let newlyPassed = false;

    if (passed) {
      if (mode === 'reading' && !readingPassed) {
        readingPassed = 1;
        newlyPassed = true;
      } else if (mode === 'listening' && !listeningPassed) {
        listeningPassed = 1;
        newlyPassed = true;
      } else if (mode === 'spelling' && !spellingPassed) {
        spellingPassed = 1;
        newlyPassed = true;
      }
    } else {
      errorCount += (errorIncrement || 1);
    }

    const mastered = (readingPassed === 1 && listeningPassed === 1 && spellingPassed === 1) ? 1 : 0;

    await pool.query(
      `INSERT INTO user_vocabulary_progress
       (user_id, vocab_id, error_count, mastered, reading_passed, listening_passed, spelling_passed)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         error_count = VALUES(error_count),
         mastered = VALUES(mastered),
         reading_passed = VALUES(reading_passed),
         listening_passed = VALUES(listening_passed),
         spelling_passed = VALUES(spelling_passed)`,
      [userId, id, errorCount, mastered, readingPassed, listeningPassed, spellingPassed]
    );

    // If passed, award coins to user based on game_settings configuration
    let coinsAwarded = 0;
    if (passed) {
      try {
        const [settingRows]: any = await pool.query(
          "SELECT setting_key, setting_value FROM game_settings WHERE setting_key IN ('coins_vocab_reading', 'coins_vocab_spelling')"
        );
        let readingReward = 10;
        let spellingReward = 20;
        for (const row of settingRows) {
          if (row.setting_key === 'coins_vocab_reading') readingReward = Number(JSON.parse(row.setting_value)) || 10;
          if (row.setting_key === 'coins_vocab_spelling') spellingReward = Number(JSON.parse(row.setting_value)) || 20;
        }

        const baseReward = mode === 'spelling' ? spellingReward : readingReward;
        // First pass awards full configured amount; review/repeat passes award 20% encouragement coins (at least 1)
        coinsAwarded = newlyPassed ? baseReward : Math.max(1, Math.round(baseReward * 0.2));
      } catch {
        const baseReward = mode === 'spelling' ? 20 : 10;
        coinsAwarded = newlyPassed ? baseReward : Math.max(1, Math.round(baseReward * 0.2));
      }

      if (coinsAwarded > 0) {
        await pool.query('UPDATE users SET coins = coins + ? WHERE id = ?', [coinsAwarded, userId]);
      }
    }

    res.json({
      success: true,
      user_id: userId,
      vocab_id: Number(id),
      mode,
      passed,
      reading_passed: readingPassed,
      listening_passed: listeningPassed,
      spelling_passed: spellingPassed,
      mastered,
      error_count: errorCount,
      coins_awarded: coinsAwarded
    });
  } catch (err: any) {
    console.error('recordWordProgress error:', err.message);
    res.status(500).json({ error: 'Failed to record word progress' });
  }
};

/**
 * POST /api/word-books/ai-enrich
 * Call AI service to enrich raw words with phonetics, sentences, antonyms, roots & etymology
 */
export const aiEnrichWords = async (req: Request, res: Response) => {
  try {
    const { words, model, cli } = req.body;
    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: 'words must be a non-empty array of strings' });
    }

    const rawWords = words.map((w: any) => String(w).trim().toLowerCase()).filter(Boolean).slice(0, 100);
    if (rawWords.length === 0) {
      return res.status(400).json({ error: 'No valid words provided' });
    }

    const agentUrl = process.env.AI_AGENT_URL || 'http://ai_agent:8000';
    const controller = new AbortController();
    const requestTimeoutMs = Math.max(180000, rawWords.length * 15000);
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      const response = await fetch(`${agentUrl.replace(/\/$/, '')}/enrich-vocabulary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: rawWords, model, cli: cli || 'agy' }),
        signal: controller.signal
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.detail || payload.error || 'AI enrichment service error');
      }

      return res.json({
        success: true,
        source: 'ai_agent',
        data: payload.data
      });
    } catch (agentErr: any) {
      console.warn('AI Agent call failed, using heuristic enrichment fallback:', agentErr.message);

      // Heuristic fallback so admin is never blocked even if AI CLI is temporarily unavailable
      const fallbackData = rawWords.map((w: string) => ({
        word: w,
        phonetic: `/${w}/`,
        translation: '',
        fun_sentences: [
          { en: '', zh: '' }
        ],
        antonyms: '',
        synonyms: '',
        root_affixes: '',
        etymology: ''
      }));

      return res.json({
        success: true,
        source: 'fallback',
        warning: `AI 服务暂时未响应（${agentErr.message}），已生成待填草稿，请在表格中补充或稍后重试。`,
        data: fallbackData
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err: any) {
    console.error('aiEnrichWords error:', err.message);
    res.status(500).json({ error: 'Failed to enrich words' });
  }
};
