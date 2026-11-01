import express from 'express';
import {  getUserCustomServices,} from '../controllers/customServiceController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Custom service routes
router.route('/')
  .get(getUserCustomServices)
  .post((_req,res)=>res.status(403).json({message:'Submit a custom cleaning request for an administrator quote instead.'}));

router.route('/:id')
  .put((_req,res)=>res.status(403).json({message:'Customer service editing is disabled. Use Custom cleaning requests.'}))
  .delete((_req,res)=>res.status(403).json({message:'Customer service deletion is disabled.'}));

export default router;