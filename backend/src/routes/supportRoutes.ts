import express from 'express';import {protect} from '../middleware/authMiddleware';import {listTickets,createTicket,updateTicket} from '../controllers/supportController';
const router=express.Router();router.use(protect);router.get('/',listTickets);router.post('/',createTicket);router.patch('/:id',updateTicket);export default router;
