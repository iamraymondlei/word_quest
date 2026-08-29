import { Router } from 'express';
import { getVersionHistory } from '../controllers/versionController';

const router = Router();

router.get('/', getVersionHistory);

export default router;
