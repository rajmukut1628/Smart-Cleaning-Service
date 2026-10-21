import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  createReview,
  getWorkerReviews,
  getBookingReview,
  getUserReviews,
  updateReview,
  deleteReview,
  getAllReviews
} from '../controllers/reviewController';

const router = express.Router();

// Create a review (protected)
router.post('/create', protect, createReview);

// Get reviews for a specific worker (public)
router.get('/worker/:workerId', getWorkerReviews);

// Get review for a specific booking (protected)
router.get('/booking/:bookingId', protect, getBookingReview);

// Get all reviews by logged-in user (protected)
router.get('/my-reviews', protect, getUserReviews);

// Update a review (protected)
router.put('/:reviewId', protect, updateReview);

// Delete a review (protected)
router.delete('/:reviewId', protect, deleteReview);

// Get all reviews (public)
router.get('/all', getAllReviews);

export default router;
