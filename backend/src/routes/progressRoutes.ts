import { Router } from 'express';
import { 
  updateStage, 
  logError, 
  updateTranslationStats, 
  getTranslationStats,
  getProgress,
  getStars,
  recalculateStarsHandler
} from '../controllers/progressController';

const router = Router();
router.get('/', getProgress);
router.get('/stars', getStars);
router.post('/update-stage', updateStage);
router.post('/log-error', logError);
router.post('/update-translation-stats', updateTranslationStats);
router.get('/get-translation-stats', getTranslationStats);
router.post('/recalculate-stars', recalculateStarsHandler);
router.post('/recalculate', recalculateStarsHandler);

export default router;
