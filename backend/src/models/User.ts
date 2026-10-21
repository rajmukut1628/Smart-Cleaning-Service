import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Required for local auth
  role: { type: String, enum: ['user', 'worker', 'admin', 'superadmin', 'blocked'], default: 'user' },
  phone: { type: String, required: true },
  address: { type: String },
  profilePicture: { type: String, default: '' },
  adminSettings: { type: mongoose.Schema.Types.Mixed, default: () => ({ emailNotifications: true, systemAlerts: true, userRegistrationAlerts: true, bookingAlerts: true, twoFactorEnabled: false, dashboardTheme: 'light', itemsPerPage: 10, autoRefreshInterval: 30 }) },
  // User-specific fields
  familySize: { type: Number, default: 1 },
  hasPets: { type: Boolean, default: false },
  petDetails: { type: String, default: '' },
  specialNeeds: { type: String, default: '' },
  emergencyContacts: [{
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relationship: { type: String, required: true }
  }],
  preferredTimeSlots: [{ type: String, enum: ['morning', 'afternoon', 'evening'] }],
  // Worker-specific fields
  bio: { type: String, default: '' },
  skills: [{ type: String }],
  experience: { type: Number, default: 0 }, // years of experience
  availability: {
    monday: { start: String, end: String },
    tuesday: { start: String, end: String },
    wednesday: { start: String, end: String },
    thursday: { start: String, end: String },
    friday: { start: String, end: String },
    saturday: { start: String, end: String },
    sunday: { start: String, end: String },
  },
  paymentInfo: {
    method: { type: String, enum: ['bank', 'paypal', 'cash'], default: 'cash' },
    accountNumber: String,
    bankName: String,
    paypalEmail: String,
  },
  isVerified: { type: Boolean, default: false },
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);

export default User;
