import {requestEmailChange,verifyEmailChange} from '../controllers/emailChangeController';
import {limitRegistrationEmails} from '../middleware/registrationRateLimit';
import express from 'express';
import {
  getProfile,
  updateProfile,
  updateProfilePicture,
  changePassword,
  getUserSpendingAnalytics,
} from '../controllers/profileController';
import { protect } from '../middleware/authMiddleware';
import { imageUpload as upload } from '../utils/imageStorage';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Profile routes
router.get('/', getProfile);
router.put('/', updateProfile);
router.put('/picture', upload.single('profilePicture'), updateProfilePicture);
router.put('/password', changePassword);
router.get('/spending-analytics', getUserSpendingAnalytics);

router.post('/email-change',limitRegistrationEmails,requestEmailChange);
router.post('/email-change/verify',verifyEmailChange);
export default router;
