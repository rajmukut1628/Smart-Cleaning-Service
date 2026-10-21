import express from 'express';
import {
  getServices,
  createService,
  updateService,
  deleteService,
  seedServices
} from '../controllers/serviceController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

// Public route to get all services
router.route('/').get(getServices);

// Admin-only routes for CRUD operations
router.route('/').post(protect, admin, createService);
router.route('/:id').put(protect, admin, updateService);
router.route('/:id').delete(protect, admin, deleteService);

// Development-only route to seed data
router.route('/seed').post(protect, admin, seedServices);

export default router;
