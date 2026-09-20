import { Router } from 'express';
import { getWords } from '../controllers/wordController';

const router = Router();

router.get('/', getWords);

export default router;
