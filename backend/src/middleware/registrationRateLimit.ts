import { Request, Response, NextFunction } from 'express';
const attempts = new Map<string, { count: number; expires: number }>();
export function limitRegistrationEmails(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key);
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const record = attempts.get(key) || { count: 0, expires: now + 15 * 60000 };
  if (record.count >= 10) return res.status(429).json({ message: 'Too many verification email requests. Please try again later.', retryAfter: Math.ceil((record.expires - now) / 1000) });
  record.count++;
  attempts.set(key, record);
  next();
}
