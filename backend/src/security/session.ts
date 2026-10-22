import jwt from 'jsonwebtoken';
import { sessionClaims } from './ownership';

export const session = async (user: any) => {
  const access = await sessionClaims(user);
  return { _id: user._id, name: user.name, email: user.email, role: access.role,
    phone: user.phone || '', profilePicture: user.profilePicture,
    token: jwt.sign({ id: user._id, ...access }, process.env.JWT_SECRET as string, { expiresIn: '30d' }) };
};
