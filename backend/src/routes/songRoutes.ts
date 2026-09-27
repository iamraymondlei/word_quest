import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createSong, deleteSong, ensureSongUploadDir, getSong, getSongAudio, getSongs, parseSongLrc, translateSong, updateSong } from '../controllers/songController';

ensureSongUploadDir();
const uploadDir = path.resolve(process.env.SONG_UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'songs'));
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 80) || 'song';
    cb(null, `${Date.now()}-${safeBase}${path.extname(file.originalname).toLowerCase()}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, cb) => {
    const isAudio = file.fieldname === 'audio' && ['audio/mpeg', 'audio/mp3', 'application/octet-stream'].includes(file.mimetype);
    const isLrc = file.fieldname === 'lrc' && (file.mimetype === 'text/plain' || file.mimetype === 'application/octet-stream');
    cb(null, isAudio || isLrc);
  },
});

// Keep the upload directory import explicit for deployments that create it after startup.
fs.mkdirSync(uploadDir, { recursive: true });

const router = Router();
router.get('/', getSongs);
router.post('/', upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'lrc', maxCount: 1 }]), createSong);
router.post('/parse-lrc', expressJson(), parseSongLrc);
router.post('/:id/translate', expressJson(), translateSong);
router.get('/audio/:filename', getSongAudio);
router.get('/:id', getSong);
router.put('/:id', expressJson(), updateSong);
router.delete('/:id', deleteSong);

function expressJson() {
  // Express' global JSON parser already handles these routes; this no-op middleware
  // keeps the route declarations self-documenting without duplicating parser state.
  return (_req: any, _res: any, next: any) => next();
}

export default router;
