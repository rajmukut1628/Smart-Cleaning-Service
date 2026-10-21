import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notificationId: { type: String, required: true },
  readAt: { type: Date, default: Date.now },
});
schema.index({ recipient: 1, notificationId: 1 }, { unique: true });
export default mongoose.model('NotificationRead', schema);
