import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { provisionRequestedOwner } from '../security/provisionRequestedOwner';
// Explicit maintenance command only. This is never run automatically by the normal server.
dotenv.config({ path: '.env.live', quiet: true });
async function main() {
  if (!process.env.MONGO_URI?.startsWith('mongodb+srv://')) throw new Error('A live Atlas MONGO_URI is required.');
  if (process.env.OWNER_SETUP_EMAIL !== 'rajmukut66@gmail.com') throw new Error('Set OWNER_SETUP_EMAIL to the explicitly requested new owner.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const result = await provisionRequestedOwner({ email: process.env.OWNER_SETUP_EMAIL, password: process.env.OWNER_SETUP_PASSWORD || '', phone: process.env.OWNER_SETUP_PHONE || '' });
  console.log(JSON.stringify(result));
}
main().catch(error => {
  // Only expose known validation errors; driver messages may contain connection details.
  const safe = ['A live Atlas', 'Set OWNER_SETUP', 'This setup', 'Provide the requested', 'The current owner', 'The target account', 'Owner account', 'Ownership changed'];
  console.error(safe.some(prefix => String(error.message).startsWith(prefix)) ? error.message : 'Owner setup failed. Check the live database connection and transaction permissions.');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
