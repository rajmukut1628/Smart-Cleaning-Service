import express from 'express';
import {
  getAssignedBookings,
  updateBookingStatusByWorker,
  getAssignedCustomers,
  getWorkerProfile,
  updateWorkerProfile,
  changeWorkerPassword,
  getWorkerEarnings,
} from '../controllers/workerController';
import { protect, worker } from '../middleware/authMiddleware';
import { getWorkerNotifications, readWorkerNotifications, getWorkerFeedback } from '../controllers/workerNotificationController';

const router = express.Router();

// All routes in this file are protected and for workers only
router.use(protect, worker);
router.get('/notifications', getWorkerNotifications);
router.patch('/notifications/read', readWorkerNotifications);
router.get('/feedback', getWorkerFeedback);

router.route('/my-jobs').get(getAssignedBookings);
router.route('/my-customers').get(getAssignedCustomers);
router.route('/bookings/:id/status').put(updateBookingStatusByWorker);
router.route('/profile').get(getWorkerProfile).put(updateWorkerProfile);
router.route('/change-password').put(changeWorkerPassword);
router.route('/earnings').get(getWorkerEarnings);

export default router;
