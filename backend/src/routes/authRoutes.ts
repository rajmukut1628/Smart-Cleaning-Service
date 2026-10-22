import {limitSignIn} from '../middleware/loginRateLimit';
import express from 'express';
import { forgotPassword, resetPassword } from '../controllers/passwordResetController';
import { loginUser, googleAuth } from '../controllers/authController';
import { registerUser, verifyRegistration, resendVerification, googleRegister } from '../controllers/registrationController';
import { limitRegistrationEmails } from '../middleware/registrationRateLimit';

const router = express.Router();

// Traditional auth routes
router.post('/register', limitRegistrationEmails, registerUser);
router.post('/register/verify', verifyRegistration);
router.post('/register/resend', limitRegistrationEmails, resendVerification);
router.post('/login', limitSignIn, loginUser);
router.post('/forgot-password', limitRegistrationEmails, forgotPassword);
router.post('/reset-password', limitRegistrationEmails, resetPassword);
router.post('/google', limitSignIn, googleAuth);
router.post('/google/register', limitSignIn, googleRegister);

export default router;
