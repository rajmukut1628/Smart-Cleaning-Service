import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 3000 },
  address: { type: String, required: true, maxlength: 500 },
  preferredDate: { type: String, required: true }, preferredTime: { type: String, required: true },
  images: [{ type: String }],
  status: { type: String, enum: ['pending','quoted','booked','declined','rejected','withdrawn'], default: 'pending', index: true },
  version: { type: Number, default: 0 },
  quote: { amount: Number, duration: Number, notes: String, quotedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, quotedAt: Date },
  decisionNote: String,
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
}, { timestamps: true, optimisticConcurrency: true });
export default mongoose.model('CustomCleaningRequest', schema);
