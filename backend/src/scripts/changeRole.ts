/**
 * Script to change user role
 * Usage: ts-node src/scripts/changeRole.ts <email> <role>
 * Example: ts-node src/scripts/changeRole.ts user@example.com admin
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

const changeUserRole = async (email: string, newRole: string) => {
    try {
        // Validate role
        const validRoles = ['user', 'worker', 'admin', 'blocked'];
        if (!validRoles.includes(newRole)) {
            console.log(`❌ Invalid role: ${newRole}`);
            console.log(`Valid roles: ${validRoles.join(', ')}`);
            process.exit(1);
        }

        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bd-clean-master';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Find and update user
        const user = await User.findOneAndUpdate(
            { email },
            { role: newRole },
            { new: true }
        ).select('-password');

        if (!user) {
            console.log(`❌ User not found with email: ${email}`);
            process.exit(1);
        }

        console.log(`✅ User role updated successfully!`);
        console.log('\nUser details:', {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });

        console.log('\n⚠️  IMPORTANT: User must logout and login again to see the changes!');
        console.log('   Or clear localStorage and refresh the page.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

// Get arguments
const email = process.argv[2];
const role = process.argv[3];

if (!email || !role) {
    console.log('Usage: ts-node src/scripts/changeRole.ts <email> <role>');
    console.log('Example: ts-node src/scripts/changeRole.ts user@example.com admin');
    console.log('\nValid roles: user, worker, admin, blocked');
    process.exit(1);
}

changeUserRole(email, role);
