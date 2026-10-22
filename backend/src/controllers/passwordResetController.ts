import { Request, Response } from 'express';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import PasswordReset from '../models/PasswordReset';
import { sendPasswordChangedEmail, sendPasswordResetEmail } from '../utils/passwordResetEmail';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const codeHash = (id: string, code: string) => createHmac('sha256', process.env.JWT_SECRET!).update(`password-reset:${id}:${code}`).digest('hex');
const genericMessage = 'If this email belongs to an eligible password account, a reset code will arrive shortly. Check your inbox and Spam folder.';

// Work runs after the same response for every email, avoiding account-existence disclosure.
export async function queuePasswordReset(email: string, verificationId: string) {
  try {
    const user = await User.findOne({ email });
    if (!user || user.role === 'blocked' || user.authProvider === 'google' || !user.password) return;
    const code = String(randomInt(100000, 1000000));
    const pending = await PasswordReset.findOneAndUpdate({ userId: user._id, $or: [{ lastSentAt: { $lte: new Date(Date.now() - 60000) } }, { lastSentAt: { $exists: false } }] }, { $set: { email, verificationIdHash: hash(verificationId), codeHash: codeHash(verificationId, code), passwordFingerprint: hash(user.password), attempts: 0, lastSentAt: new Date(), expiresAt: new Date(Date.now() + 600000) } }, { upsert: true, new: true, runValidators: true });
    if (!pending) return;
    try { await sendPasswordResetEmail(email, user.name, code); }
    catch { await PasswordReset.deleteOne({ userId: user._id, verificationIdHash: hash(verificationId) }); console.warn('Password reset email delivery failed. Check email provider configuration.'); }
  } catch (error: any) {
    // A duplicate userId means another request already acquired the per-account cooldown.
    if (error.code !== 11000) console.warn('Password reset request could not be queued.');
  }
}
export async function forgotPassword(req: Request, res: Response) {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (!process.env.JWT_SECRET) return res.status(503).json({ message: 'Password recovery is temporarily unavailable.' });
  const verificationId = randomBytes(32).toString('hex');
  res.status(202).json({ message: genericMessage, verificationId, retryAfter: 60, expiresIn: 600 });
  void queuePasswordReset(email, verificationId);
}
export async function resetPassword(req: Request, res: Response) {
  const { verificationId, code, password, confirmPassword } = req.body;
  if (typeof verificationId !== 'string' || !/^[a-f0-9]{64}$/.test(verificationId) || typeof code !== 'string' || !/^\d{6}$/.test(code)) return res.status(400).json({ message: 'Enter the six-digit reset code sent to your email.' });
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72 || password !== confirmPassword) return res.status(400).json({ message: 'Passwords must match and contain at least 8 characters, up to 72 bytes.' });
  if (!process.env.JWT_SECRET) return res.status(503).json({ message: 'Password recovery is temporarily unavailable.' });
  const invalid = () => res.status(400).json({ message: 'This reset code is invalid, expired or already used. Request a new code.' });
  try {
    const pending = await PasswordReset.findOneAndUpdate({ verificationIdHash: hash(verificationId), expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } }, { $inc: { attempts: 1 } }, { new: true });
    if (!pending) return invalid();
    const candidate = codeHash(verificationId, code);
    if (!timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(pending.codeHash, 'hex'))) return res.status(400).json({ message: `Incorrect code. ${Math.max(0, 5 - pending.attempts)} attempts remaining.` });
    const user = await User.findById(pending.userId);
    if (!user || user.role === 'blocked' || user.authProvider === 'google' || user.email !== pending.email || hash(user.password) !== pending.passwordFingerprint) return invalid();
    const passwordHash = await bcrypt.hash(password, 12);
    const consumed = await PasswordReset.findOneAndDelete({ _id: pending._id, verificationIdHash: hash(verificationId), codeHash: candidate, expiresAt: { $gt: new Date() } });
    if (!consumed) return invalid();
    // Compare-and-set prevents concurrent resets or password changes from reusing old proof.
    const changed = await User.findOneAndUpdate({ _id: user._id, password: user.password, email: pending.email, authProvider: { $ne: 'google' }, role: { $ne: 'blocked' } }, { $set: { password: passwordHash }, $inc: { sessionVersion: 1 } }, { new: true });
    if (!changed) return invalid();
    const io = req.app?.get('io');
    io?.to('user:' + String(user._id)).emit('session-revoked');
    io?.in('user:' + String(user._id)).disconnectSockets(true);
    // Never send the new password or issue a login session from the reset endpoint.
    void sendPasswordChangedEmail(user.email, user.name).catch(() => console.warn('Password change notification could not be delivered.'));
    return res.json({ message: 'Password reset successfully. Sign in with your new password.' });
  } catch { return res.status(500).json({ message: 'Could not reset your password. Please try again.' }); }
}
