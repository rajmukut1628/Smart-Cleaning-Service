import express from 'express';
import {
  createCustomService,
  getUserCustomServices,
  updateCustomService,
  deleteCustomService,
} from '../controllers/customServiceController';
import { protect } from '../middleware/authMiddleware';
import { imageUpload as upload } from '../utils/imageStorage';

const router = express.Router();

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