import { Router } from 'express';
import multer from 'multer';
import {
  createOrUpdateIsland,
  getIslands,
  uploadIslandWords,
  exportErrors,
  uploadStoryCSV,
  importAIStory,
  updateIslandAccess,
  getAIModels,
  deleteIsland,
  generateStoryQuestions,
  updateStoryQuestions,
  generateStoryFromVocab
} from '../controllers/islandController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', getIslands);
router.post('/', createOrUpdateIsland);
router.delete('/:id', deleteIsland);
router.put('/:id/access', updateIslandAccess);
router.put('/:id/questions', updateStoryQuestions);
router.post('/:id/generate-questions', generateStoryQuestions);
router.post('/generate-questions', generateStoryQuestions);
router.post('/:id/ai-generate-story', generateStoryFromVocab);
router.post('/ai-generate-story', generateStoryFromVocab);
router.get('/ai-models', getAIModels);
router.post('/upload-words', upload.single('file'), uploadIslandWords);
router.post('/upload-story-csv', upload.single('file'), uploadStoryCSV);
router.post('/import-ai-story', upload.array('images', 10), importAIStory);
router.get('/export-errors', exportErrors);

export default router;
