import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  basePrice: { type: Number, required: true, min:0 },
  pricePerSqFt: { type: Number, default: 0, min:0 }, // For sqft based services
  pricePerUnit: { type: Number, default: 0, min:0 }, // For quantity based services (e.g. per car, per room)
  unitConfig: { type: mongoose.Schema.Types.ObjectId, ref: 'UnitConfig' }, // Linked unit configuration
  duration: { type: Number, required: true, min:0.25,max:24 }, // duration in hours
  image: { type: String, default: '' }, // Optional image
  features: [{ type: String }],
  isCustom: { type: Boolean, default: false }, // true for user-created services
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // user who created this service
}, {
  timestamps: true,
});

const Service = mongoose.model('Service', serviceSchema);

export default Service;
