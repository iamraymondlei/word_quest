import { Router } from 'express';
import { getGameSettings, updateGameSettings } from '../controllers/settingController';

const router = Router();

router.get('/', getGameSettings);
router.put('/', updateGameSettings);

export default router;
