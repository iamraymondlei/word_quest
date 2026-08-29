import { Router } from 'express';
import multer from 'multer';
import { createOrUpdateIsland, getIslands, uploadIslandWords, exportErrors, uploadStoryCSV, importAIStory, updateIslandAccess, getAIModels } from '../controllers/islandController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', getIslands);
router.post('/', createOrUpdateIsland);
router.put('/:id/access', updateIslandAccess);
router.get('/ai-models', getAIModels);
router.post('/upload-words', upload.single('file'), uploadIslandWords);
router.post('/upload-story-csv', upload.single('file'), uploadStoryCSV);
router.post('/import-ai-story', upload.array('images', 10), importAIStory);
router.get('/export-errors', exportErrors);

export default router;
