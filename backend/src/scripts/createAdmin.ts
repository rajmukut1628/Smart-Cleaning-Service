import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
dotenv.config();
async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PHONE || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) throw new Error('Set ADMIN_EMAIL, ADMIN_PHONE and ADMIN_PASSWORD (12+ characters)');
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bd-clean-master');
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) { existing.role = 'superadmin'; await existing.save(); }
  else await User.create({ name: ADMIN_NAME || 'Administrator', email, phone: ADMIN_PHONE, password: await bcrypt.hash(ADMIN_PASSWORD, 12), role: 'superadmin' });
  console.log('Superadmin account ready');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
