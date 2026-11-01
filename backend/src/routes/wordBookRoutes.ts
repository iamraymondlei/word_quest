import express from 'express';
import pool from '../config/db';
import {
  getWordBooks,
  getWordBookAccess,
  updateWordBookAccess,
  createWordBook,
  updateWordBook,
  deleteWordBook,
  getBookWords,
  addWordsToBook,
  updateVocabularyWord,
  deleteVocabularyWord,
  batchMoveVocabularyWords,
  batchDeleteVocabularyWords,
  recordWordProgress,
  recordBookStageProgress,
  getVocabularyStats,
  getPracticeWords,
  aiEnrichWords,
  syncAllIslandsToWordBooks
} from '../controllers/wordBookController';

const router = express.Router();

// Vocabulary Progress & Weak Words Stats (Task 12.1)
router.get('/users/:userId/vocabulary-stats', getVocabularyStats);
router.get('/users/:userId/vocabulary-stats/practice-words', getPracticeWords);

// Word Books routes
router.get('/word-books', getWordBooks);
router.post('/word-books', createWordBook);
router.post('/word-books/:id/progress', recordBookStageProgress);
router.post('/word-books/sync-stories', async (req, res) => {
  try {
    const result = await syncAllIslandsToWordBooks(pool);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/word-books/:id/access', getWordBookAccess);
router.put('/word-books/:id/access', updateWordBookAccess);
router.put('/word-books/:id', updateWordBook);
router.delete('/word-books/:id', deleteWordBook);

// Words in a book
router.get('/word-books/:id/words', getBookWords);
router.post('/word-books/:id/words', addWordsToBook);

// AI Enrichment
router.post('/word-books/ai-enrich', aiEnrichWords);
router.post('/word-books/enrich-words', aiEnrichWords);

// Batch vocabulary word actions (MUST precede :id to prevent matching 'batch-move'/'batch-delete' as ':id')
router.post('/vocabulary-words/batch-move', batchMoveVocabularyWords);
router.post('/vocabulary-words/batch-delete', batchDeleteVocabularyWords);

// Single vocabulary word actions
router.put('/vocabulary-words/:id', updateVocabularyWord);
router.delete('/vocabulary-words/:id', deleteVocabularyWord);
router.post('/vocabulary-words/:id/progress', recordWordProgress);

export default router;
