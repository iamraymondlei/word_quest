import { Router } from 'express';
import multer from 'multer';
import { uploadWords, getWords } from '../controllers/wordController';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/upload', upload.single('file'), uploadWords);
router.get('/', getWords);

export default router;
