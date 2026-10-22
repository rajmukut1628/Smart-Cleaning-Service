import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { validateSession } from '../security/ownership';

// Extend Express Request interface to include user property
interface AuthenticatedRequest extends Request {
  user?: any;
  ownership?: any;
}

export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify JWT token
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

      // Get user from database
      const user = await User.findById(decoded.id).select('-password');

      if (!user || user.role === 'blocked') {
        return res.status(401).json({ message: 'User not found' });
      }

      const access = await validateSession(decoded, user);
      req.ownership = access.ownership;
      user.role = access.role as typeof user.role;
      req.user = user;
      next();
    } catch (error: any) {
      console.error('❌ Token verification failed:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const admin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

export const superAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user && req.ownership && String(req.ownership.ownerId) === String(req.user._id)) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a super admin' });
  }
};

export const worker = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'worker') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a worker' });
  }
};
