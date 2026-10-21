import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect((process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bd-clean-master'));
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
