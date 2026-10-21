/**
 * Script to make a user admin
 * Usage: ts-node src/scripts/makeAdmin.ts <email>
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

const makeAdmin = async (email: string) => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bd-clean-master';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Find and update user
        const user = await User.findOneAndUpdate(
            { email },
            { role: 'admin' },
            { new: true }
        ).select('-password');

        if (!user) {
            console.log(`❌ User not found with email: ${email}`);
            process.exit(1);
        }

        console.log(`✅ User ${email} is now an admin!`);
        console.log('User details:', {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
    console.log('Usage: ts-node src/scripts/makeAdmin.ts <email>');
    console.log('Example: ts-node src/scripts/makeAdmin.ts user@example.com');
    process.exit(1);
}

makeAdmin(email);
