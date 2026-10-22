import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import User from '../models/User';
import { session } from '../security/session';
import PendingRegistration from '../models/PendingRegistration';
import { sendVerificationEmail } from '../utils/verificationEmail';
import { verifyGoogleIdToken } from '../utils/googleIdToken';

const hashId = (id: string) => createHash('sha256').update(id).digest('hex');
const hashCode = (id: string, code: string) => {
  if (!process.env.JWT_SECRET) throw Object.assign(new Error('Registration is temporarily unavailable.'), { status: 503 });
  return createHmac('sha256', process.env.JWT_SECRET).update(`${id}:${code}`).digest('hex');
};
const newChallenge = () => {
  const verificationId = randomBytes(32).toString('hex');
  const code = String(randomInt(100000, 1000000));
  return { verificationId, code, verificationIdHash: hashId(verificationId), codeHash: hashCode(verificationId, code) };
};
function replyError(res: Response, error: any) {
  const status = [400, 401, 403, 404, 409, 429, 503].includes(error.status) ? error.status : error.code === 11000 ? 409 : 500;
  return res.status(status).json({ message: status === 500 ? 'Registration could not be completed. Please try again.' : error.code === 11000 ? 'An account or registration already exists. Please sign in or wait before retrying.' : error.message });
}
const validId = (id: unknown): id is string => typeof id === 'string' && /^[a-f0-9]{64}$/.test(id);

export const registerUser = async (req: Request, res: Response) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
  const password = req.body.password;
  if (!name || name.length > 100 || !phone || phone.length > 30 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email) || email.length > 254 || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) return res.status(400).json({ message: 'Enter your name, email, phone and a password of 8–72 bytes.' });
  try {
    if (await User.exists({ email })) return res.status(409).json({ message: 'An account already exists for this email. Please sign in using its original method.' });
    const existing = await PendingRegistration.findOne({ email });
    if (existing && Date.now() - existing.lastSentAt.getTime() < 60000) return res.status(429).json({ message: 'A code was recently sent. Wait 60 seconds before requesting another.', retryAfter: Math.ceil((60000 - (Date.now() - existing.lastSentAt.getTime())) / 1000) });
    const challenge = newChallenge();
    const passwordHash = await bcrypt.hash(password, 10);
    await PendingRegistration.findOneAndUpdate({ email, $or: [{ lastSentAt: { $lte: new Date(Date.now() - 60000) } }, { lastSentAt: { $exists: false } }] }, { $set: { name, email, phone, passwordHash, verificationIdHash: challenge.verificationIdHash, codeHash: challenge.codeHash, attempts: 0, lastSentAt: new Date(), expiresAt: new Date(Date.now() + 600000) } }, { upsert: true, new: true, runValidators: true });
    try { await sendVerificationEmail(email, name, challenge.code); }
    catch (error) { await PendingRegistration.deleteOne({ email, verificationIdHash: challenge.verificationIdHash }); throw error; }
    return res.status(202).json({ message: 'Check your email for the verification code.', email, verificationId: challenge.verificationId, expiresIn: 600, retryAfter: 60 });
  } catch (error) { return replyError(res, error); }
};

export const verifyRegistration = async (req: Request, res: Response) => {
  const { verificationId, code } = req.body;
  if (!validId(verificationId) || typeof code !== 'string' || !/^\d{6}$/.test(code)) return res.status(400).json({ message: 'Enter the six-digit code from your email.' });
  try {
    const pending = await PendingRegistration.findOneAndUpdate({ verificationIdHash: hashId(verificationId), expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } }, { $inc: { attempts: 1 } }, { new: true });
    if (!pending) return res.status(400).json({ message: 'This code has expired, was already used, or reached its attempt limit. Request another code or sign up again.' });
    const candidate = hashCode(verificationId, code);
    if (!timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(pending.codeHash, 'hex'))) return res.status(400).json({ message: `Incorrect code. ${Math.max(0, 5 - pending.attempts)} attempts remaining.` });
    const consumed = await PendingRegistration.findOneAndDelete({ _id: pending._id, verificationIdHash: pending.verificationIdHash, codeHash: candidate, expiresAt: { $gt: new Date() } });
    if (!consumed) return res.status(400).json({ message: 'This verification was already completed or changed. Please sign in or request a new code.' });
    const user = await User.create({ name: consumed.name, email: consumed.email, phone: consumed.phone, password: consumed.passwordHash, authProvider: 'local', role: 'user', emailVerifiedAt: new Date() });
    return res.status(201).json({ ...(await session(user)), message: 'email verified. You are now signed in.' });
  } catch (error) { return replyError(res, error); }
};

export const resendVerification = async (req: Request, res: Response) => {
  const { verificationId } = req.body;
  if (!validId(verificationId)) return res.status(400).json({ message: 'Please start your registration again.' });
  try {
    const pending = await PendingRegistration.findOne({ verificationIdHash: hashId(verificationId) });
    if (!pending || pending.expiresAt.getTime() <= Date.now()) return res.status(400).json({ message: 'Your registration has expired. Please sign up again.' });
    const wait = Math.ceil((60000 - (Date.now() - pending.lastSentAt.getTime())) / 1000);
    if (wait > 0) return res.status(429).json({ message: `Wait ${wait} seconds before resending.`, retryAfter: wait });
    const code = String(randomInt(100000, 1000000));
    const nextHash = hashCode(verificationId, code);
    const updated = await PendingRegistration.findOneAndUpdate({ _id: pending._id, codeHash: pending.codeHash, lastSentAt: pending.lastSentAt, expiresAt: { $gt: new Date() } }, { $set: { codeHash: nextHash, attempts: 0, lastSentAt: new Date(), expiresAt: new Date(Date.now() + 600000) } }, { new: true });
    if (!updated) return res.status(429).json({ message: 'A verification request is already in progress. Please wait.' });
    try { await sendVerificationEmail(updated.email, updated.name, code); }
    catch (error) { await PendingRegistration.updateOne({ _id: updated._id, codeHash: nextHash }, { $set: { codeHash: pending.codeHash, attempts: pending.attempts, expiresAt: pending.expiresAt, lastSentAt: pending.lastSentAt } }); throw error; }
    return res.json({ message: 'A new verification code was sent.', retryAfter: 60, expiresIn: 600 });
  } catch (error) { return replyError(res, error); }
};

export const googleRegister = async (req: Request, res: Response) => {
  try {
    const claims = await verifyGoogleIdToken(req.body?.credential);
    if (await User.exists({ email: claims.email })) return res.status(409).json({ message: 'This email already has an account. Sign in using the method you used to register.' });
    const password = await bcrypt.hash(randomUUID(), 10);
    await User.create({ name: claims.name?.trim() || claims.email!.split('@')[0], email: claims.email, password, role: 'user', authProvider: 'google', googleSubject: claims.sub, phone: '', profilePicture: claims.picture || '', emailVerifiedAt: new Date() });
    await PendingRegistration.deleteOne({ email: claims.email });
    return res.status(201).json({ message: 'Your Google account is registered. Please use Continue with Google on the sign-in page.' });
  } catch (error) { return replyError(res, error); }
};
