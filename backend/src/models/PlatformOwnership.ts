import mongoose from 'mongoose';
const event = new mongoose.Schema({
  action: { type: String, enum: ['initialized', 'transferred', 'admin_removed', 'admin_deleted'], required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, actorName: String,
  targetId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, targetName: String, targetEmail: String,
  previousOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  at: { type: Date, default: Date.now },
}, { _id: false });
const schema = new mongoose.Schema({
  _id: { type: String, default: 'platform' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  revision: { type: Number, default: 0 },
  sessionEpoch: { type: Number, default: 0 },
  revokedAdminIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  accessVersions: { type: Map, of: Number, default: {} },
  history: { type: [event], default: [] },
}, { timestamps: true });
export default mongoose.model('PlatformOwnership', schema);
