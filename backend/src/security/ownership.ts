import bcrypt from 'bcryptjs';
import User from '../models/User';
import PlatformOwnership from '../models/PlatformOwnership';

export const isStaff = (role: string) => ['admin', 'superadmin'].includes(role);
export const accessVersion = (ownership: any, id: any) => ownership?.accessVersions?.get?.(String(id)) || ownership?.accessVersions?.[String(id)] || 0;
export function effectiveRole(user: any, ownership: any): string {
  if (ownership && String(ownership.ownerId) === String(user._id)) return 'superadmin';
  if (ownership?.revokedAdminIds?.some((id: any) => String(id) === String(user._id)) && isStaff(user.role)) return 'user';
  return user.role === 'superadmin' ? 'admin' : user.role;
}
export async function sessionClaims(user: any) {
  const ownership = isStaff(user.role) ? await PlatformOwnership.findById('platform') : null;
  return { role: effectiveRole(user, ownership), sv: user.sessionVersion || 0, ...(isStaff(user.role) ? { staff: true, ov: ownership?.sessionEpoch || 0, av: accessVersion(ownership, user._id) } : {}) };
}
export async function validateSession(decoded: any, user: any) {
  if ((decoded.sv || 0) !== (user.sessionVersion || 0)) throw new Error('Session revoked. Please sign in again.');
  const ownership = isStaff(user.role) || decoded.staff ? await PlatformOwnership.findById('platform') : null;
  if ((isStaff(user.role) || decoded.staff) && (decoded.ov || 0) !== (ownership?.sessionEpoch || 0)) throw new Error('Access changed. Please sign in again.');
  if ((isStaff(user.role) || decoded.staff) && (decoded.av || 0) !== accessVersion(ownership, user._id)) throw new Error('Administrator access was revoked. Please sign in again.');
  return { ownership, role: effectiveRole(user, ownership) };
}

// Initialization is one-time. Later restarts always honor the stored owner, never the bootstrap email.
export async function ensurePlatformOwner() {
  let ownership = await PlatformOwnership.findById('platform');
  if (!ownership) {
    const email = (process.env.OWNER_EMAIL || 'platformauthority@gmail.com').trim().toLowerCase();
    let owner = await User.findOne({ email });
    if (!owner && process.env.OWNER_PASSWORD && process.env.OWNER_PHONE) {
      if (process.env.OWNER_PASSWORD.length < 12) throw new Error('OWNER_PASSWORD must contain at least 12 characters.');
      owner = await User.create({ name: process.env.OWNER_NAME || 'Platform Authority', email, phone: process.env.OWNER_PHONE, password: await bcrypt.hash(process.env.OWNER_PASSWORD, 12), role: 'superadmin', authProvider: 'local' });
    }
    if (!owner) { console.warn('Platform ownership needs setup: create the designated password account or configure OWNER_PASSWORD and OWNER_PHONE.'); return null; }
    if (owner.authProvider === 'google' || owner.role === 'blocked') throw new Error('The platform owner must have an active password account.');
    try { ownership = await PlatformOwnership.create({ _id: 'platform', ownerId: owner._id, revision: 0, history: [{ action: 'initialized', actorId: owner._id, actorName: owner.name, targetId: owner._id, targetName: owner.name, targetEmail: owner.email }] }); }
    catch (error: any) { if (error.code !== 11000) throw error; ownership = await PlatformOwnership.findById('platform'); }
  }
  if (!ownership) throw new Error('Platform owner could not be initialized.');
  const owner = await User.findById(ownership.ownerId);
  if (!owner || owner.authProvider === 'google' || owner.role === 'blocked') throw new Error('Stored platform owner is unavailable. Restore the owner account before starting.');
  // The single authority record enforces permissions even while these display roles are synchronized.
  await User.updateOne({ _id: ownership.ownerId, role: { $ne: 'superadmin' } }, { $set: { role: 'superadmin' }, $inc: { sessionVersion: 1 } });
  await User.updateMany({ _id: { $ne: ownership.ownerId }, role: 'superadmin' }, { $set: { role: 'admin' }, $inc: { sessionVersion: 1 } });
  if (ownership.revokedAdminIds.length) await User.updateMany({ _id: { $in: ownership.revokedAdminIds }, role: { $in: ['admin', 'superadmin'] } }, { $set: { role: 'user' }, $inc: { sessionVersion: 1 } });
  return ownership;
}
