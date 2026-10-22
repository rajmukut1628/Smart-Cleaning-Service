import mongoose from 'mongoose';
import User from '../models/User';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect((process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bd-clean-master'));
    await User.updateMany({role:'worker',isVerified:{$ne:true}},{$set:{isVerified:true}});
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
