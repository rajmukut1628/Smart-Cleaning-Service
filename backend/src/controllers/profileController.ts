import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Booking from '../models/Booking';
import bcrypt from 'bcryptjs';

// Use the same AuthenticatedRequest interface from authMiddleware
interface AuthenticatedRequest extends Request {
  user?: any;
}

// Get user profile
export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId || req.user?._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
};

// Update user profile (name, email, phone, address, familySize, hasPets, petDetails, specialNeeds, emergencyContacts, preferredTimeSlots)
export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      familySize,
      hasPets,
      petDetails,
      specialNeeds,
      emergencyContacts,
      preferredTimeSlots
    } = req.body;
    const userId = req.user?.userId || req.user?._id;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name,
        email,
        phone,
        address,
        familySize,
        hasPets,
        petDetails,
        specialNeeds,
        emergencyContacts,
        preferredTimeSlots
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

// Update profile picture
export const updateProfilePicture = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const file = req.file;

    console.log('📸 Profile picture upload request');
    console.log('File:', file);
    console.log('User ID:', userId);

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const profilePicture = `/uploads/${file.filename}`;
    console.log('💾 Saving profile picture path:', profilePicture);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePicture },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ Profile picture updated:', updatedUser.profilePicture);

    res.json({
      message: 'Profile picture updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('❌ Profile picture upload error:', error);
    res.status(500).json({ message: 'Failed to update profile picture', error: error.message });
  }
};

// Change password
export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId || req.user?._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has password (not Firebase user)
    if (!user.password) {
      return res.status(400).json({
        message: 'This account uses Firebase authentication. Password cannot be changed here.'
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to change password', error: error.message });
  }
};

// Get user spending analytics
export const getUserSpendingAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?._id;

    // Get all completed bookings for the user
    const bookings = await Booking.find({
      user: userId,
      status: 'completed',
      paymentStatus: 'paid'
    }).select('totalAmount createdAt');

    // Calculate total spent
    const totalSpent = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

    // Calculate monthly spending
    const monthlySpending: { [key: string]: number } = {};
    bookings.forEach(booking => {
      const month = new Date(booking.createdAt).toLocaleString('default', {
        year: 'numeric',
        month: 'long'
      });
      monthlySpending[month] = (monthlySpending[month] || 0) + booking.totalAmount;
    });

    res.json({
      totalSpent,
      totalBookings: bookings.length,
      monthlySpending,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch spending analytics', error: error.message });
  }
};

