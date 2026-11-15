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
  generateStoryFromVocab,
  getStoryAudio,
  getTtsVoices,
  generateStoryAudio,
  uploadStoryAudio,
  deleteStoryAudio
} from '../controllers/islandController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(mp3|m4a|wav|aac|ogg|flac)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('只支持上传常见音频文件格式 (.mp3, .m4a, .wav, .aac, .ogg, .flac)'));
    }
  }
});

router.get('/tts-voices', getTtsVoices);
router.get('/audio/:filename', getStoryAudio);
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

// Story audio endpoints (Option 1: AI TTS, Option 2: Upload MP3)
router.post('/:id/generate-audio', generateStoryAudio);
router.post('/:id/audio', audioUpload.single('audio'), uploadStoryAudio);
router.delete('/:id/audio', deleteStoryAudio);

export default router;
