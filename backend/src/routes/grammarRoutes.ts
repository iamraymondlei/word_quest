import { Router } from 'express';
import {
  getGrammarProgress,
  submitGrammarQuiz,
  getGrammarHistory,
} from '../controllers/grammarController';

const router = Router();

router.get('/progress/:userId', getGrammarProgress);
router.post('/submit', submitGrammarQuiz);
router.get('/history/:userId/:quizId', getGrammarHistory);

export default router;
