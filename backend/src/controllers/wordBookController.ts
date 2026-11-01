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
          SELECT b.id, b.category, b.title, b.description, b.tags, b.sort_order, b.island_id, b.created_at, b.updated_at,
                 COUNT(w.id) as word_count,
                 COUNT(CASE WHEN p.mastered = 1 THEN 1 END) as mastered_count,
                 COUNT(CASE WHEN (p.reading_passed = 1 OR p.listening_passed = 1 OR p.spelling_passed = 1) THEN 1 END) as started_count,
                 COALESCE(MAX(bp.completed_stages_mask), 0) as completed_stages_mask
          FROM word_books b
          LEFT JOIN vocabulary_words w ON b.id = w.book_id
          LEFT JOIN user_vocabulary_progress p ON w.id = p.vocab_id AND p.user_id = ?
          LEFT JOIN user_word_book_progress bp ON b.id = bp.book_id AND bp.user_id = ?
          GROUP BY b.id
          ORDER BY b.category ASC, b.sort_order ASC, b.id ASC
        `;
        params = [userId, userId];
      } else {
        query = `
          SELECT b.id, b.category, b.title, b.description, b.tags, b.sort_order, b.island_id, b.created_at, b.updated_at,
                 COUNT(w.id) as word_count,
                 COUNT(CASE WHEN p.mastered = 1 THEN 1 END) as mastered_count,
                 COUNT(CASE WHEN (p.reading_passed = 1 OR p.listening_passed = 1 OR p.spelling_passed = 1) THEN 1 END) as started_count,
                 COALESCE(MAX(bp.completed_stages_mask), 0) as completed_stages_mask
          FROM word_books b
          LEFT JOIN vocabulary_words w ON b.id = w.book_id
          LEFT JOIN user_vocabulary_progress p ON w.id = p.vocab_id AND p.user_id = ?
          LEFT JOIN user_word_book_progress bp ON b.id = bp.book_id AND bp.user_id = ?
          WHERE (
            b.id NOT IN (SELECT book_id FROM user_word_book_access)
            OR b.id IN (SELECT book_id FROM user_word_book_access WHERE user_id = ?)
          )
          GROUP BY b.id
          ORDER BY b.category ASC, b.sort_order ASC, b.id ASC
        `;
        params = [userId, userId, userId];
      }
    } else {
      query = `
        SELECT b.id, b.category, b.title, b.description, b.tags, b.sort_order, b.island_id, b.created_at, b.updated_at,
               COUNT(w.id) as word_count,
               0 as mastered_count,
               0 as started_count,
               0 as completed_stages_mask
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
    const { category, title, description, tags, sort_order, user_ids, island_id } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      connection.release();
      return res.status(400).json({ error: 'Word book title is required' });
    }

    const bookCategory = category && typeof category === 'string' && category.trim() ? category.trim() : 'General';

    await connection.beginTransaction();

    const [result]: any = await connection.query(
      'INSERT INTO word_books (category, title, description, tags, sort_order, island_id) VALUES (?, ?, ?, ?, ?, ?)',
      [bookCategory, title.trim(), description || '', tags || '', sort_order || 0, island_id || null]
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
    const { category, title, description, tags, sort_order, user_ids, island_id } = req.body;

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
           sort_order = COALESCE(?, sort_order),
           island_id = COALESCE(?, island_id)
       WHERE id = ?`,
      [
        category !== undefined ? (category.trim() || 'General') : null,
        title !== undefined ? title.trim() : null,
        description !== undefined ? description : null,
        tags !== undefined ? tags : null,
        sort_order !== undefined ? sort_order : null,
        island_id !== undefined ? (island_id || null) : null,
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
    const [bookRows]: any = await pool.query('SELECT id, island_id FROM word_books WHERE id = ?', [id]);
    if (bookRows.length === 0) {
      return res.status(404).json({ error: 'Word book not found' });
    }
    const islandId = bookRows[0].island_id;

    await pool.query('DELETE FROM user_word_book_access WHERE book_id = ?', [id]);
    const [result]: any = await pool.query('DELETE FROM word_books WHERE id = ?', [id]);

    // If this word book was associated with a story island, also clean up the legacy words table
    if (islandId) {
      const [oldWords]: any = await pool.query('SELECT id FROM words WHERE island_id = ?', [islandId]);
      if (oldWords.length > 0) {
        const oldWordIds = oldWords.map((w: any) => w.id);
        await pool.query('DELETE FROM user_word_progress WHERE word_id IN (?)', [oldWordIds]);
        await pool.query('DELETE FROM words WHERE island_id = ?', [islandId]);
      }
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
 * Record quiz / game result for a student (Task 12.1)
 * Supports client_id idempotency, vocabulary_attempts log, and user_vocabulary_mode_stats
 */
export const recordWordProgress = async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { userId, mode, passed, errorIncrement, answer, durationMs, clientId } = req.body;

    if (!userId || !mode) {
      connection.release();
      return res.status(400).json({ error: 'userId and mode (reading | listening | spelling) are required' });
    }

    const vocabId = Number(id);
    const effectiveClientId = (clientId && typeof clientId === 'string' && clientId.trim())
      ? clientId.trim()
      : (`srv_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`);

    await connection.beginTransaction();

    // 1. Attempt deduplication via vocabulary_attempts unique key (user_id, client_id)
    const [attemptRes]: any = await connection.query(
      `INSERT IGNORE INTO vocabulary_attempts
       (client_id, user_id, vocab_id, mode, is_correct, answer, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        effectiveClientId,
        userId,
        vocabId,
        mode,
        passed ? 1 : 0,
        answer ? String(answer).substring(0, 255) : null,
        durationMs ? Math.max(0, parseInt(durationMs, 10)) : null
      ]
    );

    if (attemptRes.affectedRows === 0) {
      // Duplicate submission detected
      await connection.commit();
      connection.release();
      return res.json({
        success: true,
        duplicate: true,
        message: 'Duplicate progress submission ignored.',
        user_id: Number(userId),
        vocab_id: vocabId,
        mode,
        passed: !!passed
      });
    }

    // 2. Query & update user_vocabulary_mode_stats for this specific mode
    const [statRows]: any = await connection.query(
      'SELECT * FROM user_vocabulary_mode_stats WHERE user_id = ? AND vocab_id = ? AND mode = ? FOR UPDATE',
      [userId, vocabId, mode]
    );

    let currentCorrect = 0;
    let currentError = 0;
    let currentStreak = 0;
    let currentMastered = 0;

    if (statRows && statRows.length > 0) {
      currentCorrect = statRows[0].correct_count || 0;
      currentError = statRows[0].error_count || 0;
      currentStreak = statRows[0].streak || 0;
      currentMastered = statRows[0].mastered || 0;
    }

    let newCorrect = currentCorrect;
    let newError = currentError;
    let newStreak = currentStreak;
    let newMastered = currentMastered;

    if (passed) {
      newCorrect += 1;
      newStreak += 1;
      if (newStreak >= 3) {
        newMastered = 1;
      }
    } else {
      newError += (errorIncrement || 1);
      newStreak = 0;
    }

    await connection.query(
      `INSERT INTO user_vocabulary_mode_stats
       (user_id, vocab_id, mode, correct_count, error_count, streak, mastered, last_result, last_practiced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         correct_count = VALUES(correct_count),
         error_count = VALUES(error_count),
         streak = VALUES(streak),
         mastered = VALUES(mastered),
         last_result = VALUES(last_result),
         last_practiced_at = NOW()`,
      [userId, vocabId, mode, newCorrect, newError, newStreak, newMastered, passed ? 1 : 0]
    );

    // 3. Keep legacy user_vocabulary_progress synchronized for backward compatibility
    const [oldRows]: any = await connection.query(
      'SELECT * FROM user_vocabulary_progress WHERE user_id = ? AND vocab_id = ? FOR UPDATE',
      [userId, vocabId]
    );

    let readingPassed = oldRows?.[0]?.reading_passed || 0;
    let listeningPassed = oldRows?.[0]?.listening_passed || 0;
    let spellingPassed = oldRows?.[0]?.spelling_passed || 0;
    let oldErrorCount = oldRows?.[0]?.error_count || 0;
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
      oldErrorCount += (errorIncrement || 1);
    }

    const legacyMastered = (readingPassed === 1 && spellingPassed === 1) ? 1 : 0;

    await connection.query(
      `INSERT INTO user_vocabulary_progress
       (user_id, vocab_id, error_count, mastered, reading_passed, listening_passed, spelling_passed)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         error_count = VALUES(error_count),
         mastered = VALUES(mastered),
         reading_passed = VALUES(reading_passed),
         listening_passed = VALUES(listening_passed),
         spelling_passed = VALUES(spelling_passed)`,
      [userId, vocabId, oldErrorCount, legacyMastered, readingPassed, listeningPassed, spellingPassed]
    );

    // 4. Award EXP / coins (first pass awards full, review awards 20% encouragement)
    let coinsAwarded = 0;
    if (passed) {
      try {
        const [settingRows]: any = await connection.query(
          "SELECT setting_key, setting_value FROM game_settings WHERE setting_key IN ('coins_vocab_reading', 'coins_vocab_spelling')"
        );
        let readingReward = 10;
        let spellingReward = 20;
        for (const row of settingRows) {
          if (row.setting_key === 'coins_vocab_reading') readingReward = Number(JSON.parse(row.setting_value)) || 10;
          if (row.setting_key === 'coins_vocab_spelling') spellingReward = Number(JSON.parse(row.setting_value)) || 20;
        }

        const baseReward = mode === 'spelling' ? spellingReward : readingReward;
        coinsAwarded = newlyPassed ? baseReward : Math.max(1, Math.round(baseReward * 0.2));
      } catch {
        const baseReward = mode === 'spelling' ? 20 : 10;
        coinsAwarded = newlyPassed ? baseReward : Math.max(1, Math.round(baseReward * 0.2));
      }

      if (coinsAwarded > 0) {
        await connection.query('UPDATE users SET coins = coins + ? WHERE id = ?', [coinsAwarded, userId]);
      }
    }

    await connection.commit();
    connection.release();

    res.json({
      success: true,
      duplicate: false,
      client_id: effectiveClientId,
      user_id: Number(userId),
      vocab_id: vocabId,
      mode,
      passed: !!passed,
      reading_passed: readingPassed,
      listening_passed: listeningPassed,
      spelling_passed: spellingPassed,
      mastered: legacyMastered || newMastered,
      mode_stats: {
        correct_count: newCorrect,
        error_count: newError,
        streak: newStreak,
        mastered: newMastered
      },
      error_count: oldErrorCount,
      coins_awarded: coinsAwarded
    });
  } catch (err: any) {
    await connection.rollback();
    connection.release();
    console.error('recordWordProgress error:', err.message);
    res.status(500).json({ error: 'Failed to record word progress' });
  }
};

/**
 * GET /api/users/:userId/vocabulary-stats
 * Query vocabulary mastery, correct/error counts, error rate, and weak score
 */
export const getVocabularyStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { mode, bookId, sort = 'weak', minAttempts } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    let query = `
      SELECT
        s.user_id,
        s.vocab_id,
        s.mode,
        s.correct_count,
        s.error_count,
        s.streak,
        s.mastered,
        s.last_result,
        s.last_practiced_at,
        w.word,
        w.phonetic,
        w.translation,
        w.book_id,
        b.title AS book_title
      FROM user_vocabulary_mode_stats s
      JOIN vocabulary_words w ON s.vocab_id = w.id
      JOIN word_books b ON w.book_id = b.id
      WHERE s.user_id = ?
    `;
    const params: any[] = [userId];

    if (mode && mode !== 'all') {
      query += ' AND s.mode = ?';
      params.push(mode);
    }

    if (bookId) {
      query += ' AND w.book_id = ?';
      params.push(bookId);
    }

    const [rows]: any = await pool.query(query, params);

    const minAtt = minAttempts ? parseInt(minAttempts as string, 10) : 0;

    const list = rows.map((r: any) => {
      const correct = r.correct_count || 0;
      const error = r.error_count || 0;
      const totalAttempts = correct + error;
      const errorRate = totalAttempts > 0 ? (error / totalAttempts) : 0;
      const lastResult = r.last_result;
      const streak = r.streak || 0;

      // Weakness Score calculation:
      // error_rate weighted at 70 points
      // last result wrong adds 30 points penalty
      // current streak reduces weakness by up to 30 points
      const lastPenalty = (lastResult === 0) ? 0.3 : 0.0;
      const streakDiscount = Math.min(streak * 0.1, 0.3);
      const rawWeakScore = (errorRate * 0.7 + lastPenalty - streakDiscount);
      const weakScore = Math.max(0, Math.min(100, Math.round(rawWeakScore * 100)));

      // If attempts < 2, mark as low sample threshold
      const isQualified = totalAttempts >= 2;

      return {
        vocab_id: r.vocab_id,
        word: r.word,
        phonetic: r.phonetic,
        translation: r.translation,
        book_id: r.book_id,
        book_title: r.book_title,
        mode: r.mode,
        correct_count: correct,
        error_count: error,
        total_attempts: totalAttempts,
        error_rate: Math.round(errorRate * 100),
        streak,
        mastered: r.mastered === 1,
        last_result: lastResult,
        last_practiced_at: r.last_practiced_at,
        weak_score: weakScore,
        is_weak: weakScore >= 40 && error > 0,
        is_qualified: isQualified
      };
    });

    const filtered = minAtt > 0 ? list.filter((item: any) => item.total_attempts >= minAtt) : list;

    // Sorting
    filtered.sort((a: any, b: any) => {
      if (sort === 'weak') {
        // High weak score first
        if (b.weak_score !== a.weak_score) return b.weak_score - a.weak_score;
        if (b.error_count !== a.error_count) return b.error_count - a.error_count;
        return new Date(b.last_practiced_at).getTime() - new Date(a.last_practiced_at).getTime();
      }
      if (sort === 'error') {
        return b.error_count - a.error_count;
      }
      if (sort === 'recent') {
        return new Date(b.last_practiced_at).getTime() - new Date(a.last_practiced_at).getTime();
      }
      return a.word.localeCompare(b.word);
    });

    // Summary statistics
    const totalWordsPracticed = filtered.length;
    const masteredCount = filtered.filter((i: any) => i.mastered).length;
    const weakCount = filtered.filter((i: any) => i.is_weak).length;

    res.json({
      user_id: Number(userId),
      summary: {
        total_practiced: totalWordsPracticed,
        mastered_count: masteredCount,
        weak_count: weakCount
      },
      words: filtered
    });
  } catch (err: any) {
    console.error('getVocabularyStats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch vocabulary statistics' });
  }
};

/**
 * GET /api/users/:userId/vocabulary-stats/practice-words
 * Get recommended practice words for targeted reinforcement (weak words first)
 */
export const getPracticeWords = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { mode, bookId, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const maxCount = Math.max(1, Math.min(50, parseInt(limit as string, 10) || 10));

    // 1. Fetch weak words from user_vocabulary_mode_stats
    let statQuery = `
      SELECT
        s.vocab_id,
        s.mode,
        s.correct_count,
        s.error_count,
        s.streak,
        s.mastered,
        s.last_result,
        w.id,
        w.book_id,
        w.word,
        w.phonetic,
        w.translation,
        w.fun_sentences_json,
        w.antonyms,
        w.synonyms,
        w.root_affixes,
        w.etymology
      FROM user_vocabulary_mode_stats s
      JOIN vocabulary_words w ON s.vocab_id = w.id
      WHERE s.user_id = ?
    `;
    const statParams: any[] = [userId];

    if (mode && mode !== 'all') {
      statQuery += ' AND s.mode = ?';
      statParams.push(mode);
    }
    if (bookId) {
      statQuery += ' AND w.book_id = ?';
      statParams.push(bookId);
    }

    const [rows]: any = await pool.query(statQuery, statParams);

    const scored = rows.map((r: any) => {
      const correct = r.correct_count || 0;
      const error = r.error_count || 0;
      const totalAttempts = correct + error;
      const errorRate = totalAttempts > 0 ? (error / totalAttempts) : 0;
      const lastPenalty = (r.last_result === 0) ? 0.3 : 0.0;
      const streakDiscount = Math.min((r.streak || 0) * 0.1, 0.3);
      const weakScore = Math.round((errorRate * 0.7 + lastPenalty - streakDiscount) * 100);

      let funSentences = [];
      try {
        funSentences = typeof r.fun_sentences_json === 'string'
          ? JSON.parse(r.fun_sentences_json)
          : (r.fun_sentences_json || []);
      } catch {
        funSentences = [];
      }

      return {
        id: r.id,
        book_id: r.book_id,
        word: r.word,
        phonetic: r.phonetic,
        translation: r.translation,
        fun_sentences: funSentences,
        antonyms: r.antonyms,
        synonyms: r.synonyms,
        root_affixes: r.root_affixes,
        etymology: r.etymology,
        mode: r.mode || 'reading',
        correct_count: correct,
        error_count: error,
        streak: r.streak || 0,
        mastered: r.mastered === 1,
        weak_score: weakScore
      };
    });

    // Sort: weak words first (high weak score and error_count > 0)
    scored.sort((a: any, b: any) => b.weak_score - a.weak_score);

    // Deduplicate by word id to avoid duplicate cards for the same word, keeping its most critical weak mode
    const deduplicatedScored: any[] = [];
    const seenScoredWordIds = new Set<number>();
    for (const item of scored) {
      if (!seenScoredWordIds.has(item.id)) {
        seenScoredWordIds.add(item.id);
        deduplicatedScored.push(item);
      }
    }

    let resultWords = deduplicatedScored.slice(0, maxCount);

    // If result count is less than requested limit, fill with other book words
    if (resultWords.length < maxCount && bookId) {
      const existingIds = new Set(resultWords.map((w: any) => w.id));
      const [moreWords]: any = await pool.query(
        'SELECT * FROM vocabulary_words WHERE book_id = ? LIMIT 50',
        [bookId]
      );
      for (const w of moreWords) {
        if (resultWords.length >= maxCount) break;
        if (!existingIds.has(w.id)) {
          let funSentences = [];
          try {
            funSentences = typeof w.fun_sentences_json === 'string'
              ? JSON.parse(w.fun_sentences_json)
              : (w.fun_sentences_json || []);
          } catch {
            funSentences = [];
          }
          resultWords.push({
            id: w.id,
            book_id: w.book_id,
            word: w.word,
            phonetic: w.phonetic,
            translation: w.translation,
            fun_sentences: funSentences,
            antonyms: w.antonyms,
            synonyms: w.synonyms,
            root_affixes: w.root_affixes,
            etymology: w.etymology,
            mode: null,
            correct_count: 0,
            error_count: 0,
            streak: 0,
            mastered: false,
            weak_score: 0
          });
        }
      }
    }

    res.json({
      user_id: Number(userId),
      mode: mode || 'all',
      count: resultWords.length,
      words: resultWords
    });
  } catch (err: any) {
    console.error('getPracticeWords error:', err.message);
    res.status(500).json({ error: 'Failed to fetch practice words' });
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

/**
 * Synchronize a single island's core practice words into word_books and vocabulary_words.
 * If connection is passed, runs inside that connection/transaction; otherwise uses pool.
 */
export const syncIslandToWordBook = async (connOrPool: any, islandId: number, incomingWords?: any[]) => {
  const [islandRows]: any = await connOrPool.query(
    'SELECT id, name, group_name, story_title FROM islands WHERE id = ?',
    [islandId]
  );
  if (!islandRows || islandRows.length === 0) return null;

  const island = islandRows[0];
  const bookCategory = (island.group_name && island.group_name.trim()) ? island.group_name.trim() : 'General';
  const bookTitle = (island.story_title && island.story_title.trim())
    ? island.story_title.trim()
    : ((island.name && island.name.trim()) ? island.name.trim() : `绘本故事关卡 ${island.id}`);
  const bookDescription = `《${bookTitle}》绘本关卡专属生词宝库`;
  const bookTags = `绘本,关卡生词,${bookCategory}`;

  // 1. Find existing word_book linked to this island
  const [existingBookRows]: any = await connOrPool.query(
    'SELECT id FROM word_books WHERE island_id = ? LIMIT 1',
    [islandId]
  );

  // If wordRows is not provided, fetch from words table
  let wordRows = incomingWords;
  if (!wordRows) {
    const [dbRows]: any = await connOrPool.query(
      'SELECT word, translation, sentence, sentence_translation FROM words WHERE island_id = ?',
      [islandId]
    );
    wordRows = dbRows;
  }

  let bookId: number;
  if (existingBookRows && existingBookRows.length > 0) {
    bookId = existingBookRows[0].id;
    await connOrPool.query(
      `UPDATE word_books
       SET title = ?, description = ?, tags = ?, category = ?
       WHERE id = ?`,
      [bookTitle, bookDescription, bookTags, bookCategory, bookId]
    );
  } else {
    // Check if book with same title & category (or old '绘本词汇') already exists without island_id
    const [titleMatchRows]: any = await connOrPool.query(
      'SELECT id FROM word_books WHERE (category = ? OR category = ?) AND title = ? LIMIT 1',
      [bookCategory, '绘本词汇', bookTitle]
    );
    if (titleMatchRows && titleMatchRows.length > 0) {
      bookId = titleMatchRows[0].id;
      await connOrPool.query(
        'UPDATE word_books SET island_id = ?, category = ?, description = ?, tags = ? WHERE id = ?',
        [islandId, bookCategory, bookDescription, bookTags, bookId]
      );
    } else {
      const [insertRes]: any = await connOrPool.query(
        `INSERT INTO word_books (category, title, description, tags, sort_order, island_id)
         VALUES (?, ?, ?, ?, 10, ?)`,
        [bookCategory, bookTitle, bookDescription, bookTags, islandId]
      );
      bookId = insertRes.insertId;
    }
  }

  // 2. Synchronize user access from user_island_access to user_word_book_access
  await connOrPool.query(
    `INSERT IGNORE INTO user_word_book_access (user_id, book_id)
     SELECT user_id, ? FROM user_island_access WHERE island_id = ?`,
    [bookId, islandId]
  );

  // 3. If incomingWords was explicitly provided, delete words from vocabulary_words that are no longer in incomingWords
  if (incomingWords && Array.isArray(incomingWords)) {
    const activeWordStrings = incomingWords
      .map((w: any) => (w.word || '').trim().toLowerCase())
      .filter(Boolean);
    if (activeWordStrings.length > 0) {
      await connOrPool.query(
        'DELETE FROM vocabulary_words WHERE book_id = ? AND word NOT IN (?)',
        [bookId, activeWordStrings]
      );
    } else {
      await connOrPool.query('DELETE FROM vocabulary_words WHERE book_id = ?', [bookId]);
    }
  }

  let syncedWordsCount = 0;
  if (wordRows && wordRows.length > 0) {
    for (const w of wordRows) {
      const rawWord = (w.word || '').trim().toLowerCase();
      if (!rawWord) continue;
      const trans = (w.translation || '').trim();
      const phonetic = (w.phonetic || '').trim();
      const sentence = (w.sentence || '').trim();
      const sentenceZh = (w.sentence_translation || '').trim();
      const antonyms = (w.antonyms || '').trim();
      const synonyms = (w.synonyms || '').trim();
      const rootAffixes = w.root_affixes
        ? (typeof w.root_affixes === 'object' ? JSON.stringify(w.root_affixes) : String(w.root_affixes).trim())
        : '';
      const etymology = w.etymology
        ? (typeof w.etymology === 'object' ? JSON.stringify(w.etymology) : String(w.etymology).trim())
        : '';

      const funSentences = Array.isArray(w.fun_sentences) && w.fun_sentences.length > 0
        ? w.fun_sentences
        : (sentence ? [{ en: sentence, zh: sentenceZh }] : []);
      const funSentencesJson = funSentences.length > 0 ? JSON.stringify(funSentences) : null;

      // Check if word exists in this book
      const [existingWordRows]: any = await connOrPool.query(
        'SELECT id, fun_sentences_json FROM vocabulary_words WHERE book_id = ? AND word = ? LIMIT 1',
        [bookId, rawWord]
      );

      if (existingWordRows && existingWordRows.length > 0) {
        const existingWord = existingWordRows[0];
        await connOrPool.query(
          `UPDATE vocabulary_words
           SET translation = COALESCE(NULLIF(?, ''), translation),
               phonetic = COALESCE(NULLIF(?, ''), phonetic),
               fun_sentences_json = COALESCE(?, fun_sentences_json),
               antonyms = COALESCE(NULLIF(?, ''), antonyms),
               synonyms = COALESCE(NULLIF(?, ''), synonyms),
               root_affixes = COALESCE(NULLIF(?, ''), root_affixes),
               etymology = COALESCE(NULLIF(?, ''), etymology)
           WHERE id = ?`,
          [trans, phonetic, funSentencesJson, antonyms, synonyms, rootAffixes, etymology, existingWord.id]
        );
      } else {
        await connOrPool.query(
          `INSERT INTO vocabulary_words (book_id, word, translation, phonetic, fun_sentences_json, antonyms, synonyms, root_affixes, etymology)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [bookId, rawWord, trans, phonetic, funSentencesJson, antonyms, synonyms, rootAffixes, etymology]
        );
      }
      syncedWordsCount++;
    }
  }

  return { bookId, bookTitle, syncedWordsCount };
};

/**
 * Synchronize all existing islands into word_books and vocabulary_words.
 */
export const syncAllIslandsToWordBooks = async (connOrPool: any) => {
  const [islands]: any = await connOrPool.query('SELECT id FROM islands ORDER BY id ASC');
  let totalBooks = 0;
  let totalWords = 0;
  for (const isl of islands) {
    const res = await syncIslandToWordBook(connOrPool, isl.id);
    if (res) {
      totalBooks++;
      totalWords += res.syncedWordsCount;
    }
  }
  return { totalBooks, totalWords };
};

/**
 * POST /api/word-books/:id/progress
 * Body: { userId: number, stage: 1 | 2 | 3 }
 * Records completion of stage in a word book:
 *  - Stage 1: bit 1 (1 << 0)
 *  - Stage 2: bit 2 (1 << 1)
 *  - Stage 3: bit 4 (1 << 2)
 * Awards 1 Star and 50 EXP (coins) on first completion of that stage.
 */
export const recordBookStageProgress = async (req: Request, res: Response) => {
  const bookId = Number(req.params.id);
  const { userId, stage } = req.body;
  const uid = Number(userId);
  const stg = Number(stage);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return res.status(400).json({ error: 'Valid book id is required' });
  }
  if (!Number.isInteger(uid) || uid <= 0) {
    return res.status(400).json({ error: 'Valid userId is required' });
  }
  if (![1, 2, 3].includes(stg)) {
    return res.status(400).json({ error: 'stage must be 1, 2, or 3' });
  }

  const stageBit = 1 << (stg - 1);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Check existing progress
    const [progRows]: any = await conn.query(
      'SELECT completed_stages_mask FROM user_word_book_progress WHERE user_id = ? AND book_id = ? FOR UPDATE',
      [uid, bookId]
    );

    const oldMask = progRows.length > 0 ? (progRows[0].completed_stages_mask || 0) : 0;
    const isNewClear = (oldMask & stageBit) === 0;
    const newMask = (oldMask | stageBit) & 7;

    if (progRows.length > 0) {
      await conn.query(
        'UPDATE user_word_book_progress SET completed_stages_mask = ? WHERE user_id = ? AND book_id = ?',
        [newMask, uid, bookId]
      );
    } else {
      await conn.query(
        'INSERT INTO user_word_book_progress (user_id, book_id, completed_stages_mask) VALUES (?, ?, ?)',
        [uid, bookId, newMask]
      );
    }

    let starsAwarded = 0;
    let coinsAwarded = 0;

    if (isNewClear) {
      starsAwarded = 1;
      coinsAwarded = 50; // 50 EXP per stage completion
      await conn.query(
        'UPDATE users SET stars = COALESCE(stars, 0) + ?, coins = COALESCE(coins, 0) + ? WHERE id = ?',
        [starsAwarded, coinsAwarded, uid]
      );
    }

    const [userRows]: any = await conn.query(
      'SELECT id, username, coins, stars, spent_stars, avatar FROM users WHERE id = ?',
      [uid]
    );

    await conn.commit();

    const updatedUser = userRows[0] || null;

    res.json({
      success: true,
      book_id: bookId,
      stage: stg,
      completed_stages_mask: newMask,
      is_new_clear: isNewClear,
      stars_awarded: starsAwarded,
      coins_awarded: coinsAwarded,
      user: updatedUser
    });
  } catch (err: any) {
    await conn.rollback();
    console.error('Error recording book stage progress:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  } finally {
    conn.release();
  }
};
