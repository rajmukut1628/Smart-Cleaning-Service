import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {listCustomRequests,createCustomRequest,quoteCustomRequest,decideCustomRequest,acceptCustomQuote} from '../controllers/customRequestController';
const router=express.Router();router.use(protect);
router.route('/').get(listCustomRequests).post(createCustomRequest);
router.patch('/:id/quote',quoteCustomRequest);
router.patch('/:id/decision',decideCustomRequest);
router.post('/:id/accept',acceptCustomQuote);
export default router;
