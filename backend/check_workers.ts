import mongoose from 'mongoose';
import User from './src/models/User';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const checkWorkers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/project-bolt');
    const workers = await User.find({ role: 'worker' });
    console.log(`Found ${workers.length} workers:`);
    workers.forEach(w => console.log(`- ${w.name} (${w.email})`));
    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
};

checkWorkers();
