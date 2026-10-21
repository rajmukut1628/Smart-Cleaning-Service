import express from 'express';
import {
  getUnitConfigs,
  getUnitConfigById,
  createUnitConfig,
  updateUnitConfig,
  deleteUnitConfig,
  seedUnitConfigs,
} from '../controllers/unitConfigController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

// Public route - Get all active unit configurations
router.get('/', getUnitConfigs);

// Admin routes
router.post('/seed', protect, admin, seedUnitConfigs);
router.get('/:id', protect, admin, getUnitConfigById);
router.post('/', protect, admin, createUnitConfig);
router.put('/:id', protect, admin, updateUnitConfig);
router.delete('/:id', protect, admin, deleteUnitConfig);

export default router;
