import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import PlatformOwnership from '../models/PlatformOwnership';

export interface OwnerSetup { email: string; password: string; phone: string }
export async function provisionRequestedOwner(configuration: OwnerSetup) {
  const { email, password, phone } = configuration;
  if (email !== 'rajmukut66@gmail.com') throw new Error('This setup is restricted to the requested new owner email.');
  if (!password || password.length < 8 || Buffer.byteLength(password) > 72 || !/^01\d{9}$/.test(phone)) throw new Error('Provide the requested owner password and a full Bangladesh phone number.');
  const session = await mongoose.startSession();
  let outcome = 'unchanged';
  try {
    await session.withTransaction(async () => {
      const ownership = await PlatformOwnership.findById('platform').session(session);
      let target = await User.findOne({ email }).session(session);
      if (ownership && target && String(ownership.ownerId) === String(target._id)) { outcome = 'already-owner'; return; }
      const previous = ownership ? await User.findById(ownership.ownerId).session(session) : null;
      if (ownership && previous?.email !== 'platformauthority@gmail.com') throw new Error('The current owner differs from the expected old owner. No ownership change was made.');
      if (target && (target.authProvider === 'google' || target.role === 'blocked' || ownership?.revokedAdminIds.some(id => String(id) === String(target!._id)))) throw new Error('The target account requires manual review. No ownership change was made.');
      const passwordHash = await bcrypt.hash(password, 12);
      if (!target) {
        [target] = await User.create([{ name: 'Raj Mukut', email, phone, password: passwordHash, authProvider: 'local', role: 'superadmin' }], { session });
      } else {
        await User.updateOne({ _id: target._id }, { $set: { password: passwordHash, phone, role: 'superadmin' }, $inc: { sessionVersion: 1 } }, { session });
      }
      if (!target) throw new Error('Owner account could not be created.');
      const event = { action: ownership ? 'transferred' : 'initialized', actorName: 'Authorized deployment setup', previousOwnerId: previous?._id, targetId: target._id, targetName: target.name, targetEmail: email, at: new Date() };
      if (ownership) {
        const updated = await PlatformOwnership.updateOne({ _id: 'platform', ownerId: ownership.ownerId, revision: ownership.revision }, { $set: { ownerId: target._id }, $inc: { revision: 1, sessionEpoch: 1 }, $push: { history: { $each: [event], $slice: -100 } } }, { session });
        if (updated.modifiedCount !== 1) throw new Error('Ownership changed concurrently. Retry after reviewing the current owner.');
      } else {
        await PlatformOwnership.create([{ _id: 'platform', ownerId: target._id, revision: 0, sessionEpoch: 1, history: [event] }], { session });
      }
      // Role writes and ownership commit together; the old owner keeps ordinary administrator access.
      await User.updateMany({ _id: { $ne: target._id }, role: 'superadmin' }, { $set: { role: 'admin' }, $inc: { sessionVersion: 1 } }, { session });
      outcome = ownership ? 'transferred' : 'created';
    });
    return { status: outcome, ownerEmail: email };
  } finally { await session.endSession(); }
}
