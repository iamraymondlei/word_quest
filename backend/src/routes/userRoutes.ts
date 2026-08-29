import { Router } from 'express';
import { loginOrRegister, getUsers, addCoins, deleteUser, updateAvatar } from '../controllers/userController';

const router = Router();
router.post('/login', loginOrRegister);
router.get('/', getUsers);
router.post('/add-coins', addCoins);
router.post('/update-avatar', updateAvatar);
router.delete('/:id', deleteUser);

export default router;
