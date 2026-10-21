import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export const registerUser = async (req: Request, res: Response) => {
  const { name, email: rawEmail, password, phone } = req.body;
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const role = 'user';
  if (!name || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ message: 'Name, phone, valid email and password of at least 8 characters are required' });
  }

  console.log('📝 Registering user:', { name, email, role, phone });

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      console.log('⚠️ User already exists:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log('📡 Creating user in database...');
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
      phone,
    });

    if (user) {
      console.log('✅ User created successfully:', user.email);
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        message: 'Account created successfully. Please sign in to continue.',
      });
    } else {
      console.log('❌ Failed to create user');
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: any) {
    console.error('🔥 Registration error:', error.message);
    res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const { password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || user.role === 'blocked') {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password for traditional users
    if (await bcrypt.compare(password, user.password as string)) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profilePicture: user.profilePicture,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const generateToken = (id: any) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: '30d',
  });
};

