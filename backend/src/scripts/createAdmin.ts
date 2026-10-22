import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { ensurePlatformOwner } from '../security/ownership';
dotenv.config();
async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bd-clean-master');
  const state = await ensurePlatformOwner();
  if (!state) throw new Error('Create the designated password account first, or configure OWNER_PASSWORD (12+ characters) and OWNER_PHONE.');
  console.log('Platform owner is configured. Existing ownership is preserved.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
