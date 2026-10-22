import {requestCancellation,decideCancellation} from '../controllers/cancellationController';
import {bookingHistory,paymentReceipt,requestReschedule,decideReschedule} from '../controllers/bookingExperienceController';
import express from 'express';
import { 
  createBooking, 
  getUserBookings,
  uploadBeforeImages,
  uploadAfterImages,
  repeatBooking
} from '../controllers/bookingController';
import { protect } from '../middleware/authMiddleware';
import { getCustomerNotifications, readCustomerNotifications } from '../controllers/customerNotificationController';

const router = express.Router();
const customerOnly: express.RequestHandler = (req: any, res, next) => req.user?.role === 'user' ? next() : res.status(403).json({ message: 'Not authorized as a customer' });
router.get('/notifications', protect, customerOnly, getCustomerNotifications);
router.patch('/notifications/read', protect, customerOnly, readCustomerNotifications);

// Route to get user's own bookings
router.route('/my-bookings').get(protect, getUserBookings);
router.route('/user').get(protect, getUserBookings);

// Route to create a new booking
router.route('/').post(protect, createBooking);

// Routes for uploading images
router.route('/:id/before-images').post(protect, uploadBeforeImages);
router.route('/:id/after-images').post(protect, uploadAfterImages);

// Route to repeat a booking
router.route('/:id/repeat').post(protect, repeatBooking);

router.get('/:id/history',protect,bookingHistory);
router.get('/:id/receipt',protect,paymentReceipt);
router.post('/:id/reschedule',protect,customerOnly,requestReschedule);
router.patch('/:id/reschedule',protect,decideReschedule);
router.post('/:id/cancellation',protect,customerOnly,requestCancellation);
router.patch('/:id/cancellation',protect,decideCancellation);
export default router;
