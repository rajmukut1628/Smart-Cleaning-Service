import { Request, Response } from 'express';
import Review from '../models/Review';
import Booking from '../models/Booking';
import User from '../models/User';
import { getReviewGallery } from './reviewGalleryController';

// Create a review
export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== Create Review Request ===');
    console.log('Body:', req.body);
    console.log('User:', (req as any).user);

    const { bookingId, rating, comment, professionalism, punctuality, quality } = req.body;
    const userId = (req as any).user.id;

    console.log('Booking ID:', bookingId);
    console.log('User ID:', userId);

    // Check if booking exists and belongs to user
    const booking = await Booking.findById(bookingId);
    console.log('Booking found:', booking ? 'Yes' : 'No');

    if (!booking) {
      console.log('Error: Booking not found');
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    if (booking.user.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized to review this booking' });
      return;
    }

    if (booking.status !== 'completed') {
      res.status(400).json({ message: 'Can only review completed bookings' });
      return;
    }

    if (booking.isReviewed) {
      res.status(400).json({ message: 'Booking already reviewed' });
      return;
    }

    if (!booking.worker) {
      res.status(400).json({ message: 'No worker assigned to this booking' });
      return;
    }

    // Create review
    const review = await Review.create({
      booking: bookingId,
      user: userId,
      worker: booking.worker,
      service: booking.service,
      rating,
      comment,
      professionalism: professionalism || rating,
      punctuality: punctuality || rating,
      quality: quality || rating,
    });

    // Mark booking as reviewed
    booking.isReviewed = true;
    await booking.save();

    const populatedReview = await Review.findById(review._id)
      .populate('user', 'name email')
      .populate('worker', 'name email')
      .populate('service', 'name');

    res.status(201).json(populatedReview);
  } catch (error: any) {
    console.error('Create review error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Review already exists for this booking' });
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
};

// Get reviews for a specific worker
export const getWorkerReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workerId } = req.params;

    const reviews = await Review.find({ worker: workerId })
      .populate('user', 'name email')
      .populate('service', 'name')
      .sort({ createdAt: -1 });

    // Calculate average ratings
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    const avgProfessionalism = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.professionalism || r.rating), 0) / reviews.length
      : 0;

    const avgPunctuality = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.punctuality || r.rating), 0) / reviews.length
      : 0;

    const avgQuality = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.quality || r.rating), 0) / reviews.length
      : 0;

    res.json({
      reviews,
      stats: {
        totalReviews: reviews.length,
        averageRating: parseFloat(avgRating.toFixed(1)),
        averageProfessionalism: parseFloat(avgProfessionalism.toFixed(1)),
        averagePunctuality: parseFloat(avgPunctuality.toFixed(1)),
        averageQuality: parseFloat(avgQuality.toFixed(1)),
      }
    });
  } catch (error: any) {
    console.error('Get worker reviews error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get review for a specific booking
export const getBookingReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;

    const review = await Review.findOne({ booking: bookingId })
      .populate('user', 'name email')
      .populate('worker', 'name email')
      .populate('service', 'name');

    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    res.json(review);
  } catch (error: any) {
    console.error('Get booking review error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all reviews by a user
export const getUserReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const reviews = await Review.find({ user: userId })
      .populate('worker', 'name email')
      .populate('service', 'name')
      .populate('booking')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error: any) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update a review
export const updateReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;
    const { rating, comment, professionalism, punctuality, quality } = req.body;
    const userId = (req as any).user.id;

    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    if (review.user.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized to update this review' });
      return;
    }

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    review.professionalism = professionalism || review.professionalism;
    review.punctuality = punctuality || review.punctuality;
    review.quality = quality || review.quality;

    await review.save();

    const updatedReview = await Review.findById(reviewId)
      .populate('user', 'name email')
      .populate('worker', 'name email')
      .populate('service', 'name');

    res.json(updatedReview);
  } catch (error: any) {
    console.error('Update review error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a review
export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;
    const userId = (req as any).user.id;

    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    if (review.user.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized to delete this review' });
      return;
    }

    // Mark booking as not reviewed
    await Booking.findByIdAndUpdate(review.booking, { isReviewed: false });

    await Review.findByIdAndDelete(reviewId);

    res.json({ message: 'Review deleted successfully' });
  } catch (error: any) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all reviews (public)
export const getAllReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.query.view === 'gallery') { await getReviewGallery(req, res); return; }
    const reviews = await Review.find()
      .populate('user', 'name profilePicture')
      .populate('service', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Filter out reviews where user or service might be null (e.g. if record was deleted)
    const validReviews = reviews.filter(review => review.user && review.service);

    res.json(validReviews);
  } catch (error: any) {
    console.error('Get all reviews error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
