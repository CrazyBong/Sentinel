import express from 'express';
import { register, login, getMe } from '../controllers/auth.controllers.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();
router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);

export default router;