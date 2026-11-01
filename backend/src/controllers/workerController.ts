import {verifiedWorkPhotoRequirement} from '../services/workPhotos';
import { Request, Response } from 'express';
import Booking from '../models/Booking';
import User from '../models/User';
import bcrypt from 'bcryptjs';

// Extend Express Request interface to include user property
interface AuthenticatedRequest extends Request {
  user?: any;
}

// @desc    Get all bookings assigned to the logged-in worker
// @route   GET /api/worker/my-jobs
// @access  Private/Worker
export const getAssignedBookings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bookings = await Booking.find({
      $or: [
        { worker: req.user._id },
        { workers: req.user._id }
      ]
    })
      .populate('user', 'name email address') // Get customer details
      .populate('service', 'name description') // Get service details
      .populate('workers', 'name email phone profilePicture bio skills experience') // Get detailed team member info
      .sort({ scheduledDate: 1 }); // Sort by the soonest
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update the status of a booking by the assigned worker
// @route   PUT /api/worker/bookings/:id/status
// @access  Private/Worker
export const updateBookingStatusByWorker = async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  const { id: bookingId } = req.params;

  // Basic validation for allowed statuses
  const allowedStatusUpdates = ['in-progress', 'completed'];
  if (!status || !allowedStatusUpdates.includes(status)) {
    return res.status(400).json({ message: 'Invalid status update' });
  }

  try {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if the booking is assigned to the worker trying to update it
    const isAssigned = booking.worker?.toString() === req.user._id.toString() ||
      (booking as any).workers?.some((id: any) => id.toString() === req.user._id.toString());

    if (!isAssigned) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }

    const expected = status === 'in-progress' ? 'confirmed' : 'in-progress';
    if (booking.status !== expected) return res.status(400).json({ message: 'Invalid booking status transition' });
    const photoError = await verifiedWorkPhotoRequirement(booking, status);
    if (photoError) return res.status(409).json({ message: photoError });
    booking.status = status;

    const updatedBooking = await booking.save();
    res.json(updatedBooking);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get customers assigned to the logged-in worker
// @route   GET /api/worker/my-customers
// @access  Private/Worker
export const getAssignedCustomers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bookings = await Booking.find({
      $or: [
        { worker: req.user._id },
        { workers: req.user._id }
      ]
    })
      .populate('user', 'name email profilePicture')
      .exec();

    // Extract unique customers
    const customerMap = new Map();
    bookings.forEach((booking: any) => {
      if (booking.user && booking.user._id) {
        customerMap.set(booking.user._id.toString(), booking.user);
      }
    });

    const customers = Array.from(customerMap.values());
    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get worker profile
// @route   GET /api/worker/profile
// @access  Private/Worker
export const getWorkerProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const worker = await User.findById(req.user._id).select('-password');
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    res.json(worker);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update worker profile
// @route   PUT /api/worker/profile
// @access  Private/Worker
export const updateWorkerProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, address, bio, skills, experience, availability, paymentInfo } = req.body;

    for (const [key, value] of Object.entries({ name, phone, address, bio })) {
      if (value !== undefined && (typeof value !== 'string' || value.length > (key === 'bio' ? 1500 : 500) || (key === 'name' && !value.trim()))) return res.status(400).json({ message: `Invalid ${key}` });
    }
    if (experience !== undefined && (typeof experience !== 'number' || !Number.isFinite(experience) || experience < 0 || experience > 80)) return res.status(400).json({ message: 'Experience must be between 0 and 80 years' });
    if (skills !== undefined && (!Array.isArray(skills) || skills.length > 20 || skills.some((skill: unknown) => typeof skill !== 'string' || !skill.trim() || skill.length > 80))) return res.status(400).json({ message: 'Provide up to 20 valid skills' });
    if (availability !== undefined) {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      if (!availability || typeof availability !== 'object' || Array.isArray(availability) || Object.entries(availability).some(([day, hours]: [string, any]) => !days.includes(day) || !hours || typeof hours !== 'object' || Object.keys(hours).some(key => !['start', 'end'].includes(key)) || !((hours.start === '' && hours.end === '') || (typeof hours.start === 'string' && typeof hours.end === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(hours.start) && /^([01]\d|2[0-3]):[0-5]\d$/.test(hours.end) && hours.start < hours.end)))) return res.status(400).json({ message: 'Use valid same-day availability hours, or mark the day off' });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (bio !== undefined) updateData.bio = bio;
    if (skills) updateData.skills = skills;
    if (experience !== undefined) updateData.experience = experience;
    if (availability) updateData.availability = availability;
    if (paymentInfo) updateData.paymentInfo = paymentInfo;

    const worker = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    res.json(worker);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Change worker password
// @route   PUT /api/worker/change-password
// @access  Private/Worker
export const changeWorkerPassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword)>72) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const worker = await User.findById(req.user._id);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Verify current password
    if (!worker.password) {
      return res.status(400).json({
        message: 'This account uses Firebase authentication. Password cannot be changed here.'
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, worker.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    worker.password = await bcrypt.hash(newPassword, salt);
    worker.sessionVersion=(worker.sessionVersion||0)+1;
    await worker.save();

    req.app?.get('io')?.to('user:'+worker._id).emit('session-revoked');
    req.app?.get('io')?.in('user:'+worker._id).disconnectSockets(true);
    res.json({ message: 'Password updated. Please sign in again.',reauthenticate:true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get worker earnings
// @route   GET /api/worker/earnings
// @access  Private/Worker
export const getWorkerEarnings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Allocated booking value, not a worker payout ledger.
    const bookings = await Booking.find({
      $or: [
        { worker: req.user._id },
        { workers: req.user._id }
      ],
      status: 'completed'
    });

    let totalEarnings = 0;
    let paidEarnings = 0;
    let pendingEarnings = 0;
    const entries: { id: string; amount: number; teamSize: number; date: string; estimatedDate: boolean; paymentStatus: string }[] = [];
    const earningsByMonth: { [key: string]: number } = {};

    bookings.forEach((booking: any) => {
      const team = new Set([booking.worker?.toString(), ...(booking.workers || []).map((id: any) => id.toString())].filter(Boolean));
      const price = booking.totalAmount / Math.max(team.size, 1);
      totalEarnings += price;
      if (booking.paymentStatus === 'paid') paidEarnings += price; else pendingEarnings += price;
      const date = new Date(booking.completedAt || booking.updatedAt);
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit' }).formatToParts(date);
      const month = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}`;
      earningsByMonth[month] = (earningsByMonth[month] || 0) + price;
      entries.push({ id: booking._id?.toString() || '', amount: price, teamSize: Math.max(team.size, 1), date: date.toISOString(), estimatedDate: !booking.completedAt, paymentStatus: booking.paymentStatus === 'paid' ? 'paid' : 'pending' });
    });

    res.json({
      totalEarnings,
      paidEarnings,
      pendingEarnings,
      entries: entries.sort((a, b) => b.date.localeCompare(a.date)),
      monthlyEarnings: earningsByMonth,
      completedJobs: bookings.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

