import express from 'express';
import {
  getProfile,
  updateProfile,
  updateProfilePicture,
  changePassword,
  getUserSpendingAnalytics,
} from '../controllers/profileController';
import { protect } from '../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Multer configuration for profile picture upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /image\/(jpeg|jpg|png|gif|webp)/;
  const extname = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
});

// All routes require authentication
router.use(protect);

// Profile routes
router.get('/', getProfile);
router.put('/', updateProfile);
router.put('/picture', upload.single('profilePicture'), updateProfilePicture);
router.put('/password', changePassword);
router.get('/spending-analytics', getUserSpendingAnalytics);

export default router;
