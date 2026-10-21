import express from 'express';
import User from '../models/User';
import { registerUser, loginUser } from '../controllers/authController';

const router = express.Router();

// Traditional auth routes
router.post('/register', registerUser);
router.post('/login', loginUser);

export default router;
