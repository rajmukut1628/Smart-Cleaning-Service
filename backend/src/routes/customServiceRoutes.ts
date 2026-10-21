import express from 'express';
import {
  createCustomService,
  getUserCustomServices,
  updateCustomService,
  deleteCustomService,
} from '../controllers/customServiceController';
import { protect } from '../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Multer configuration for service image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'service-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
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

// Custom service routes
router.route('/')
  .get(getUserCustomServices)
  .post(upload.single('image'), createCustomService);

router.route('/:id')
  .put(upload.single('image'), updateCustomService)
  .delete(deleteCustomService);

export default router;