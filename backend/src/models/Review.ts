import mongoose, { Schema } from 'mongoose';

const reviewSchema = new mongoose.Schema({
  booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  worker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  
  rating: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5
  },
  comment: { 
    type: String, 
    required: true,
    minlength: 10,
    maxlength: 500
  },
  
  // Additional review aspects
  professionalism: { type: Number, min: 1, max: 5 },
  punctuality: { type: Number, min: 1, max: 5 },
  quality: { type: Number, min: 1, max: 5 },
  
}, {
  timestamps: true,
});

// Prevent duplicate reviews for same booking
reviewSchema.index({ booking: 1 }, { unique: true });

// Index for faster queries
reviewSchema.index({ worker: 1 });
reviewSchema.index({ user: 1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
