import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import User from './models/User';
import { validateSession } from './security/ownership';

export async function authenticateSocket(socket: Socket, next: (error?: Error) => void) {
  try {
    const decoded = jwt.verify(socket.handshake.auth.token || '', process.env.JWT_SECRET as string) as { id: string };
    const user = await User.findById(decoded.id).select('role sessionVersion');
    if (!user || user.role === 'blocked') return next(new Error('Not authorized'));
    await validateSession(decoded, user);
    socket.data.userId = user.id;
    next();
  } catch { next(new Error('Not authorized')); }
}
