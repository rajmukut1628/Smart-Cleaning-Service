import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import PlatformOwnership from '../models/PlatformOwnership';

// Run from backend. This dedicated ignored file keeps live credentials separate from localhost.
const configuration = dotenv.config({ path: '.env.live', quiet: true });
async function main() {
  const uri = configuration.parsed?.MONGO_URI;
  const password = configuration.parsed?.OWNER_RESET_PASSWORD;
  if (!uri?.startsWith('mongodb+srv://')) throw new Error('Set the live Atlas MONGO_URI in backend/.env.live. Local databases are intentionally refused.');
  if (!password || password.length < 8 || Buffer.byteLength(password) > 72) throw new Error('Set OWNER_RESET_PASSWORD to 8 or more characters, up to 72 bytes.');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const email = 'platformauthority@gmail.com';
  const ownership = await PlatformOwnership.findById('platform');
  const account = await User.findOne({ email });
  if (!account || !ownership) throw new Error('The live owner account is not initialized. No account or ownership has been changed.');
  if (String(ownership.ownerId) !== String(account._id)) throw new Error('This email is not the current platform owner. Ownership has been preserved.');
  if (account.role === 'blocked' || account.authProvider === 'google') throw new Error('Owner account must be an active password account. No changes made.');
  const result = await User.updateOne({ _id: account._id, email, password: account.password, role: { $ne: 'blocked' }, authProvider: { $ne: 'google' } }, { $set: { password: await bcrypt.hash(password, 12), role: 'superadmin' }, $inc: { sessionVersion: 1 } });
  if (result.modifiedCount !== 1) throw new Error('The account changed during recovery. Retry after checking ownership.');
  console.log('Live owner password updated. Sign in as platformauthority@gmail.com. Previous HTTP sessions are revoked. Ownership was preserved.');
}
main().catch(() => { console.error('Owner password reset could not be completed. Check the Atlas URI, database name, current owner, account status and reset password. No ownership transfer was performed.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
