import mongoose, { Schema } from 'mongoose';

const bookingSchema = new mongoose.Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  worker: { type: Schema.Types.ObjectId, ref: 'User' }, // Keeping for compatibility (primary worker)
  workers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Array of all assigned workers

  // Customer and booking details
  address: { type: String, required: true },
  squareFootage: { type: Number, required: true }, // Keeping for compatibility, but used as generic units
  units: { type: Number, default: 0 }, // New generic unit field
  unitType: { type: String, default: 'square' }, // e.g., "square", "unit", "others"
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String, required: true }, // e.g., "10:00"
  specialInstructions: { type: String },

  // Status and Financials
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  totalAmount: { type: Number, required: true },
  completedAt: Date,
  paymentMethod: { type: String, enum: ['cash'], default: 'cash' },
  paymentConfirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  paymentConfirmedAt: Date,
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },

  // Images - Before and After
  beforeImages: [{ type: String }], // Array of image URLs
  afterImages: [{ type: String }], // Array of image URLs

  // Review flag
  isReviewed: { type: Boolean, default: false },

}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Preserve the first completion date when later payment updates change updatedAt.
bookingSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) this.completedAt = new Date();
  next();
});
const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
