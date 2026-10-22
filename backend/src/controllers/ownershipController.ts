import { Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import PlatformOwnership from '../models/PlatformOwnership';
import User from '../models/User';
interface OwnerRequest extends Request { user?: any; ownership?: any }
const failedProofs = new Map<string, { count: number; until: number }>();
async function proveOwner(req: OwnerRequest) {
  const actorId = String(req.user?._id);
  if (!req.ownership || String(req.ownership.ownerId) !== actorId) throw Object.assign(new Error('Only the current platform owner can do this.'), { status: 403 });
  for (const [key, value] of failedProofs) if (value.until <= Date.now()) failedProofs.delete(key);
  const counter = failedProofs.get(actorId) || { count: 0, until: Date.now() + 15 * 60000 };
  if (counter.count >= 5) throw Object.assign(new Error('Too many password attempts. Try again in 15 minutes.'), { status: 429 });
  const actor = await User.findById(actorId).select('password authProvider');
  if (!actor || actor.authProvider === 'google' || typeof req.body.password !== 'string' || !(await bcrypt.compare(req.body.password, actor.password))) {
    counter.count++; failedProofs.set(actorId, counter);
    throw Object.assign(new Error('Your current owner password is incorrect.'), { status: 400 });
  }
  failedProofs.delete(actorId);
}
function actionError(res: Response, error: any) { return res.status([400, 401, 403, 404, 409, 429].includes(error.status) ? error.status : 500).json({ message: error.status ? error.message : 'The ownership action could not be completed. Refresh and try again.' }); }
function endSessions(req: OwnerRequest, ids: string[]) {
  const io = req.app?.get('io');
  for (const id of ids) { io?.to('user:' + id).emit('session-revoked'); io?.in('user:' + id).disconnectSockets(true); }
}

export async function getOwnership(req: OwnerRequest, res: Response) {
  try {
    const state = await PlatformOwnership.findById('platform');
    if (!state) return res.status(503).json({ message: 'Platform owner setup is required. Run the owner setup script.' });
    const owner = await User.findById(state.ownerId).select('name email');
    const candidates = await User.find({ _id: { $nin: [state.ownerId, ...state.revokedAdminIds] }, role: { $in: ['admin', 'superadmin'] }, authProvider: { $ne: 'google' } }).select('name email role');
    return res.json({ owner: owner ? { _id: owner._id, name: owner.name, email: owner.email } : null, isOwner: String(state.ownerId) === String(req.user._id), revision: state.revision, candidates, history: state.history.slice(-20).reverse() });
  } catch { return res.status(500).json({ message: 'Could not load ownership details.' }); }
}

export async function transferOwnership(req: OwnerRequest, res: Response) {
  try {
    const { targetId, revision, confirmEmail } = req.body;
    if (!mongoose.isValidObjectId(targetId) || !Number.isInteger(revision)) return res.status(400).json({ message: 'Choose an administrator and refresh ownership details before continuing.' });
    if (String(targetId) === String(req.user._id)) return res.status(400).json({ message: 'You already own this platform.' });
    await proveOwner(req);
    const target = await User.findById(targetId);
    if (!target || !['admin', 'superadmin'].includes(target.role) || target.authProvider === 'google') return res.status(400).json({ message: 'The new owner must be an existing administrator with password access.' });
    if (typeof confirmEmail !== 'string' || confirmEmail.trim().toLowerCase() !== target.email.toLowerCase()) return res.status(400).json({ message: 'Type the selected administrator’s full email to confirm.' });
    const state = await PlatformOwnership.findOneAndUpdate({ _id: 'platform', ownerId: req.user._id, revision, revokedAdminIds: { $ne: target._id } }, {
      $set: { ownerId: target._id }, $inc: { revision: 1, sessionEpoch: 1 },
      $push: { history: { $each: [{ action: 'transferred', actorId: req.user._id, actorName: req.user.name, previousOwnerId: req.user._id, targetId: target._id, targetName: target.name, targetEmail: target.email, at: new Date() }], $slice: -100 } },
    }, { new: true });
    if (!state) return res.status(409).json({ message: 'Ownership changed while you were confirming. Refresh before trying again.' });
    // Authority and history have already changed atomically in one document. Access never depends on both role writes succeeding.
    await Promise.allSettled([
      User.updateOne({ _id: target._id }, { $set: { role: 'superadmin' }, $inc: { sessionVersion: 1 } }),
      User.updateOne({ _id: req.user._id }, { $set: { role: 'admin' }, $inc: { sessionVersion: 1 } }),
    ]);
    const staff = await User.find({ role: { $in: ['admin', 'superadmin'] } }).select('_id').catch(() => []);
    endSessions(req, [...new Set([String(target._id), String(req.user._id), ...staff.map(person => String(person._id))])]);
    return res.json({ message: 'Ownership transferred. All administrators must sign in again. You now have ordinary administrator access.', owner: { _id: target._id, name: target.name, email: target.email } });
  } catch (error) { return actionError(res, error); }
}

export async function removeAdministrator(req: OwnerRequest, res: Response) {
  try {
    const id = String(req.params.id);
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid administrator.' });
    if (id === String(req.ownership?.ownerId) || id === String(req.user._id)) return res.status(400).json({ message: 'The current owner cannot be removed. Transfer ownership first.' });
    await proveOwner(req);
    const target = await User.findById(id);
    if (!target || !['admin', 'superadmin'].includes(target.role)) return res.status(404).json({ message: 'Administrator not found.' });
    if (typeof req.body.confirmEmail !== 'string' || req.body.confirmEmail.trim().toLowerCase() !== target.email.toLowerCase()) return res.status(400).json({ message: 'Type this administrator’s full email to confirm removal.' });
    const state = await PlatformOwnership.findOneAndUpdate({ _id: 'platform', ownerId: req.user._id, revision: req.ownership.revision }, { $inc: { revision: 1, ['accessVersions.' + id]: 1 }, $addToSet: { revokedAdminIds: target._id }, $push: { history: { $each: [{ action: 'admin_removed', actorId: req.user._id, actorName: req.user.name, targetId: target._id, targetName: target.name, targetEmail: target.email, at: new Date() }], $slice: -100 } } }, { new: true });
    if (!state) return res.status(409).json({ message: 'Ownership details changed. Refresh and try again.' });
    await User.updateOne({ _id: target._id, role: { $in: ['admin', 'superadmin'] } }, { $set: { role: 'user' }, $inc: { sessionVersion: 1 } }).catch(() => console.warn('Removed administrator display role will be synchronized on restart.'));
    endSessions(req, [id]);
    return res.json({ message: 'Administrator access removed and previous sessions revoked.' });
  } catch (error) { return actionError(res, error); }
}
