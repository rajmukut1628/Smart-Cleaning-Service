import {bookingEvent} from '../middleware/requestContext';
import mongoose, { Schema } from 'mongoose';

const bookingSchema = new mongoose.Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  worker: { type: Schema.Types.ObjectId, ref: 'User' }, // Keeping for compatibility (primary worker)
  workers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Array of all assigned workers

  customRequest: {type:Schema.Types.ObjectId,ref:'CustomCleaningRequest',unique:true,sparse:true},
  // Customer and booking details
  address: { type: String, required: true },
  squareFootage: { type: Number, required: true }, // Keeping for compatibility, but used as generic units
  units: { type: Number, default: 0 }, // New generic unit field
  unitType: { type: String, default: 'square' }, // e.g., "square", "unit", "others"
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String, required: true }, // e.g., "10:00"
  specialInstructions: { type: String },

  serviceSnapshot:{type:mongoose.Schema.Types.Mixed,immutable:true},
  customerSnapshot:{type:mongoose.Schema.Types.Mixed,immutable:true},
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

  timeline: [{kind:String,label:String,at:{type:Date,default:Date.now},actorId:{type:Schema.Types.ObjectId,ref:'User'},actorName:String,actorRole:String}],
  cancellation:{id:String,status:{type:String,enum:['pending','approved','rejected']},reason:String,requestedAt:Date,decidedAt:Date,decidedBy:{type:Schema.Types.ObjectId,ref:'User'}},
  reschedule: {id:String,status:{type:String,enum:['pending','approved','rejected']},requestedDate:Date,requestedTime:String,reason:String,requestedAt:Date,decidedAt:Date,decidedBy:{type:Schema.Types.ObjectId,ref:'User'}},
  // Review flag
  isReviewed: { type: Boolean, default: false },

}, {
  optimisticConcurrency: true,
  timestamps: true, // Adds createdAt and updatedAt
});

// Preserve the first completion date when later payment updates change updatedAt.
bookingSchema.pre('save', function(next) {
  if(!this.isNew&&!this.timeline.length&&this.createdAt)this.timeline.push({kind:'created',label:'Booking created',at:this.createdAt});
  if(this.isNew)this.timeline.push(bookingEvent('created','Booking created'));
  else if(this.isModified('status'))this.timeline.push(bookingEvent('status',this.status==='completed'?'Cleaning work completed':this.status==='in-progress'?'Cleaning started':this.status==='cancelled'?'Booking cancelled':'Booking confirmed'));
  if((this.worker||this.workers.length)&&(this.isModified('worker')||this.isModified('workers')))this.timeline.push(bookingEvent('assignment','Cleaning team updated'));
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) this.completedAt = new Date();
  next();
});
bookingSchema.pre('updateMany', function () {const update=this.getUpdate() as any;if(!update||Array.isArray(update))return;const status=update.status||update.$set?.status;if(status){update.$push={...update.$push,timeline:bookingEvent('status','Booking status updated to '+status)};update.$inc={...update.$inc,__v:1};this.setUpdate(update);}});
const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
