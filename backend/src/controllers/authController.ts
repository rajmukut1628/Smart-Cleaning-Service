import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { verifyGoogleIdToken } from '../utils/googleIdToken';
import { session } from '../security/session';
export { registerUser } from './registrationController';


// Google sign-in never creates or links an account.
export const googleAuth = async (req: Request, res: Response) => {
  try {
    const claims = await verifyGoogleIdToken(req.body?.credential);
    const user = await User.findOne({ email: claims.email });
    if (!user) return res.status(404).json({ message: 'No account found. Please sign up with Google first.' });
    if (user.role !== 'user') return res.status(403).json({ message: 'Google sign-in is only available for customer accounts. Staff must use their password.' });
    if (user.authProvider !== 'google') return res.status(409).json({ message: 'This account was registered with a password. Sign in using your email and password.' });
    if (user.googleSubject && user.googleSubject !== claims.sub) return res.status(401).json({ message: 'This Google account does not match the registered account.' });
    // Older Google-only accounts have no subject yet; bind only after a verified Google proof.
    if (!user.googleSubject) { user.googleSubject = claims.sub; await user.save(); }
    return res.json(await session(user));
  } catch (error: any) {
    const status = [401, 403, 503].includes(error.status) ? error.status : 500;
    return res.status(status).json({ message: status === 500 ? 'Google sign-in failed. Please try again.' : error.message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const { password } = req.body;
  if (typeof password !== 'string' || !password) return res.status(400).json({ message: 'Enter your email and password.' });
  try {
    const user = await User.findOne({ email });
    if (!user || user.role === 'blocked') return res.status(401).json({ message: 'Invalid email or password. If you do not have an account, sign up first.' });
    // Provider separation applies only to customers; existing staff credentials keep working.
    if (user.role === 'user' && user.authProvider === 'google') return res.status(409).json({ message: 'This account uses Google sign-in. Please choose Continue with Google.' });
    if (!(await bcrypt.compare(password, user.password as string))) return res.status(401).json({ message: 'Invalid email or password' });
    return res.json(await session(user));
  } catch { return res.status(500).json({ message: 'Server error' }); }
};
