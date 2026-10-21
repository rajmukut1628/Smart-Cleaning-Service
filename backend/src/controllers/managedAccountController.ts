import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';

export async function createManagedAccount(req: Request, res: Response) {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
  const { password, role = 'user' } = req.body;
  if (!name || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8 || !['user','worker'].includes(role)) return res.status(400).json({ message: 'Provide name, valid email, phone, an 8-character password and a User or Worker role' });
  try {
    if (await User.findOne({ email })) return res.status(409).json({ message: 'An account already exists with this email' });
    const account = await User.create({ name, email, phone, role, password: await bcrypt.hash(password, 12) });
    return res.status(201).json({ _id: account._id, name: account.name, email: account.email, phone: account.phone, role: account.role, createdAt: account.createdAt });
  } catch (error) {
    if ((error as {code?: number}).code === 11000) return res.status(409).json({ message: 'An account already exists with this email' });
    return res.status(500).json({ message: 'Could not create account' });
  }
}
