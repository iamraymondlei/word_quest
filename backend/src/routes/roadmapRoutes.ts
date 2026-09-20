import { Router } from 'express';
import { getRoadmapItems, updateRoadmapItem } from '../controllers/roadmapController';

const router = Router();

router.get('/', getRoadmapItems);
router.put('/:id', updateRoadmapItem);

export default router;
