import mongoose from 'mongoose';
import Service from './src/models/Service';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const checkService = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/project-bolt');
    const service = await Service.findOne({ name: 'this is a test' }).populate('unitConfig');
    console.log('Service details:');
    console.log(JSON.stringify(service, null, 2));
    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
};

checkService();
