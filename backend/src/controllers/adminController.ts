import ActivityLog from '../models/ActivityLog';
import { Request, Response } from 'express';
import Booking from '../models/Booking';
import User from '../models/User';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Extend Express Request interface to include user property
interface AuthenticatedRequest extends Request {
  user?: any;
}

// @desc    Get all bookings
// @route   GET /api/admin/bookings
// @access  Private/Admin
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await Booking.find({})
      .populate('user', 'name email')
      .populate('service', 'name duration')
      .populate('worker', 'name')
      .populate('workers', 'name')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all users (or filter by role)
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req: Request, res: Response) => {
  const { role } = req.query;
  const filter = role ? { role } : {};

  try {
    const users = await User.find(filter).select('-password');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all workers
// @route   GET /api/admin/workers
// @access  Private/Admin
export const getAllWorkers = async (req: Request, res: Response) => {
  try {
    const workers = await User.find({ role: 'worker' }).select('-password');
    res.json(workers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Assign a worker to a booking
// @route   PUT /api/admin/bookings/:id/assign
// @access  Private/Admin
export const assignWorkerToBooking = async (req: Request, res: Response) => {
  const { workerIds } = req.body; // Expecting an array of IDs
  const { id: bookingId } = req.params;

  if (!workerIds || !Array.isArray(workerIds)) {
    return res.status(400).json({ message: 'Please provide an array of worker IDs' });
  }

  try {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify all workers exist and have the correct role
    const workers = await User.find({ _id: { $in: workerIds }, role: 'worker' });
    if (workers.length !== workerIds.length) {
      return res.status(404).json({ message: 'One or more workers not found or invalid role' });
    }

    const requestedService = await (await import('../models/Service')).default.findById(booking.service);
    const startOf = (value: any) => {
      const [hour, minute] = value.scheduledTime.split(':').map(Number);
      const day = new Date(value.scheduledDate).toISOString().slice(0,10);
      return Date.parse(day + 'T' + String(hour).padStart(2,'0') + ':' + String(minute).padStart(2,'0') + ':00+06:00');
    };
    const start = startOf(booking);
    const end = start + (requestedService?.duration || 2) * 3600000;
    const candidates = await Booking.find({ _id: { $ne: bookingId }, $or: [{worker: {$in: workerIds}}, {workers: {$in: workerIds}}], status: {$nin:['cancelled','completed']} }).populate('service','duration');
    if (candidates.some((other: any) => { const otherStart = startOf(other); const otherEnd = otherStart + (other.service?.duration || 2) * 3600000; return start < otherEnd && otherStart < end; })) return res.status(409).json({message:'An assigned worker has an overlapping job. Choose another worker or time.'});
    if (!workerIds.length) return res.status(400).json({message:'Select at least one worker'});

    booking.workers = workerIds;
    booking.worker = workerIds[0] || undefined; // Legacy compatibility
    booking.status = 'confirmed';

    const updatedBooking = await booking.save();
    res.json(updatedBooking);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const [users, bookings, serviceBookings] = await Promise.all([
      User.find({}),
      Booking.find({}),
      Booking.aggregate([
        {
          $group: {
            _id: '$service',
            bookings: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'services',
            localField: '_id',
            foreignField: '_id',
            as: 'serviceDetails'
          }
        },
        {
          $unwind: {path:'$serviceDetails',preserveNullAndEmptyArrays:true}
        },
        {
          $project: {
            _id: 0,
            service: {$ifNull:['$serviceDetails.name','Unavailable service']},
            bookings: 1
          }
        }
      ])
    ]);

    const totalRevenue = bookings
      .filter(b => b.status === 'completed' && b.paymentStatus === 'paid')
      .reduce((acc, booking) => acc + booking.totalAmount, 0);

    const monthlyRevenue = bookings
      .filter(b => b.status === 'completed' && b.paymentStatus === 'paid')
      .reduce((acc: Record<string, { month: string; revenue: number }>, booking) => {
        const date = booking.paymentConfirmedAt || booking.scheduledDate;
        const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dhaka',year:'numeric',month:'numeric'}).formatToParts(date);
        const month = Number(parts.find(part=>part.type==='month')?.value)-1;
        const year = Number(parts.find(part=>part.type==='year')?.value);
        const key = `${year}-${monthNames[month]}`;

        if (!acc[key]) {
          acc[key] = { month: year + ' ' + monthNames[month], revenue: 0 };
        }
        acc[key].revenue += booking.totalAmount;
        return acc;
      }, {});

    const totalBookings = bookings.length;
    const totalUsers = users.filter(u => u.role === 'user').length;
    const totalWorkers = users.filter(u => u.role === 'worker').length;

    res.json({
      totalRevenue,
      totalBookings,
      totalUsers,
      totalWorkers,
      monthlyRevenue: Object.keys(monthlyRevenue).sort((a,b)=>{const [ay,am]=a.split('-'),[by,bm]=b.split('-');return Number(ay)-Number(by)||monthNames.indexOf(am)-monthNames.indexOf(bm);}).map(key=>monthlyRevenue[key]),
      serviceBookings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new booking as an admin
// @route   POST /api/admin/bookings
// @access  Private/Admin
export const createBookingByAdmin = async (req: Request, res: Response) => {
  const {
    user,
    service,
    worker,
    address,
    squareFootage,
    scheduledDate,
    scheduledTime,
    totalAmount,
  } = req.body;

  if (!user || !service || !address || !scheduledDate || !scheduledTime) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    const booking = new Booking({
      user,
      service,
      worker: worker || undefined, // Optional worker assignment
      address,
      squareFootage,
      scheduledDate,
      scheduledTime,
      totalAmount,
      status: worker ? 'confirmed' : 'pending', // Confirmed if worker assigned, otherwise pending
      paymentStatus: 'pending',
    });

    const createdBooking = await booking.save();
    res.status(201).json(createdBooking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all admins
// @route   GET /api/admin/admins
// @access  Private/Admin
export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).select('-password');
    res.json(admins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new admin
// @route   POST /api/admin/admins
// @access  Private/Admin
export const createAdmin = async (req: Request, res: Response) => {
  const { name, email, password, phone, address } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email, and password' });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      phone,
      address,
    });

    const createdUser = await user.save();
    res.status(201).json({
      _id: createdUser._id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role,
      phone: createdUser.phone,
      address: createdUser.address,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update admin role or details
// @route   PUT /api/admin/admins/:id
// @access  Private/Admin
export const updateAdmin = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, role, phone, address } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent changing own role to non-admin
    if (req.user && req.user._id.toString() === id && role && role !== req.user.role) {
      return res.status(400).json({ message: 'Cannot change your own administrator role' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    if (role && !['user', 'worker', 'admin', 'superadmin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    user.role = role || user.role;
    user.phone = phone || user.phone;
    user.address = address || user.address;

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      address: updatedUser.address,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete admin (change role to user)
// @route   DELETE /api/admin/admins/:id
// @access  Private/Admin
export const deleteAdmin = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting self
    if (req.user && req.user._id.toString() === id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    user.role = 'user'; // Change to user instead of deleting
    await user.save();

    res.json({ message: 'Admin role removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Bulk update booking status
// @route   PUT /api/admin/bookings/bulk-update
// @access  Private/Admin
export const bulkUpdateBookings = async (req: AuthenticatedRequest, res: Response) => {
  const { bookingIds, status } = req.body;

  if (!bookingIds || !Array.isArray(bookingIds) || !status) {
    return res.status(400).json({ message: 'Please provide bookingIds array and status' });
  }

  const validStatuses = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const result = await Booking.updateMany(
      { _id: { $in: bookingIds } },
      { status }
    );

    res.json({
      message: `Updated ${result.modifiedCount} bookings to ${status}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Bulk cancel bookings
// @route   PUT /api/admin/bookings/bulk-cancel
// @access  Private/Admin
export const bulkCancelBookings = async (req: AuthenticatedRequest, res: Response) => {
  const { bookingIds } = req.body;

  if (!bookingIds || !Array.isArray(bookingIds)) {
    return res.status(400).json({ message: 'Please provide bookingIds array' });
  }

  try {
    const result = await Booking.updateMany(
      { _id: { $in: bookingIds } },
      { status: 'cancelled' }
    );

    res.json({
      message: `Cancelled ${result.modifiedCount} bookings`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Bulk delete users
// @route   DELETE /api/admin/users/bulk-delete
// @access  Private/Admin
export const bulkDeleteUsers = async (req: AuthenticatedRequest, res: Response) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds)) {
    return res.status(400).json({ message: 'Please provide userIds array' });
  }

  try {
    // Filter out admin users - don't delete them
    const users = await User.find({ _id: { $in: userIds } });
    const nonAdminUserIds = users
      .filter(u => u.role !== 'admin')
      .map(u => u._id);

    if (nonAdminUserIds.length === 0) {
      return res.status(400).json({ message: 'No non-admin users selected for deletion' });
    }

    const result = await User.deleteMany({ _id: { $in: nonAdminUserIds } });

    res.json({
      message: `Deleted ${result.deletedCount} users (admins were skipped)`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Bulk block/unblock users
// @route   PUT /api/admin/users/bulk-block
// @access  Private/Admin
export const bulkBlockUsers = async (req: AuthenticatedRequest, res: Response) => {
  const { userIds, block } = req.body;

  if (!userIds || !Array.isArray(userIds)) {
    return res.status(400).json({ message: 'Please provide userIds array' });
  }

  try {
    // Filter out admin users - don't block/unblock them
    const users = await User.find({ _id: { $in: userIds } });
    const nonAdminUserIds = users
      .filter(u => u.role !== 'admin')
      .map(u => u._id);

    if (nonAdminUserIds.length === 0) {
      return res.status(400).json({ message: 'No non-admin users selected for blocking/unblocking' });
    }

    const result = await User.updateMany(
      { _id: { $in: nonAdminUserIds } },
      { isBlocked: block }
    );

    res.json({
      message: `${block ? 'Blocked' : 'Unblocked'} ${result.modifiedCount} users (admins were skipped)`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get admin settings
// @route   GET /api/admin/settings
// @access  Private/Admin
export const getAdminSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id).select('adminSettings');
    const settings = user?.adminSettings || {};
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update admin settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
export const updateAdminSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if ((req.body.itemsPerPage !== undefined && ![10,25,50].includes(req.body.itemsPerPage)) || (req.body.autoRefreshInterval !== undefined && ![15,30,60].includes(req.body.autoRefreshInterval))) return res.status(400).json({message:'Invalid preferences'});
    const allowed = ['emailNotifications', 'systemAlerts', 'userRegistrationAlerts', 'bookingAlerts', 'dashboardTheme', 'itemsPerPage', 'autoRefreshInterval'];
    const settings = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    await User.findByIdAndUpdate(req.user._id, { $set: Object.fromEntries(Object.entries(settings).map(([key,value]) => ['adminSettings.' + key, value])) });
    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get activity logs
// @route   GET /api/admin/activity-logs
// @access  Private/Admin
export const getActivityLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await ActivityLog.find({}).sort({ timestamp: -1 }).limit(100).lean();
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Export data
// @route   GET /api/admin/export/:type
// @access  Private/Admin
export const exportData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type } = req.params;

    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'users':
        data = await User.find({}).select('-password');
        filename = 'users_export.csv';
        break;
      case 'bookings':
        data = await Booking.find({})
          .populate('user', 'name email')
          .populate('service', 'name');
        filename = 'bookings_export.csv';
        break;
      case 'all':
        const users = await User.find({}).select('-password');
        const bookings = await Booking.find({})
          .populate('user', 'name email')
          .populate('service', 'name');
        data = [...users, ...bookings];
        filename = 'all_data_export.csv';
        break;
      default:
        return res.status(400).json({ message: 'Invalid export type' });
    }

    // Convert to CSV format
    if (data.length === 0) {
      return res.status(404).json({ message: 'No data found' });
    }

    const records = data.map(row => row.toObject ? row.toObject() : row);
    const headers = Array.from(new Set(records.flatMap(row => Object.keys(row))));
    const escape = (value: any) => {
      let text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (/^[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const csvHeaders = headers.map(escape).join(',');
    const csvRows = records.map(row => headers.map(key => escape(row[key])).join(','));
    const csvContent = [csvHeaders, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Verify or unverify a worker
// @route   PUT /api/admin/workers/:id/verify
// @access  Private/Admin
export const verifyWorker = async (req: Request, res: Response) => {
  const { id: workerId } = req.params;
  const { isVerified } = req.body;

  try {
    const worker = await User.findById(workerId);

    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    if (worker.role !== 'worker') {
      return res.status(400).json({ message: 'User is not a worker' });
    }

    worker.isVerified = isVerified;
    await worker.save();

    res.json({
      message: `Worker ${isVerified ? 'verified' : 'unverified'} successfully`,
      worker: {
        _id: worker._id,
        name: worker.name,
        email: worker.email,
        isVerified: worker.isVerified
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update any user's role
// @route   PUT /api/admin/users/:id/role
// @access  Private/SuperAdmin
export const updateUserRole = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  const validRoles = ['user', 'worker', 'admin', 'superadmin', 'blocked'];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Role protection logic
    // 1. Only superadmin can use this endpoint (enforced by middleware)
    // 2. Prevent a superadmin from demoting themselves (to avoid losing access)
    if (req.user._id.toString() === id && role !== 'superadmin') {
      return res.status(400).json({ message: 'You cannot demote yourself from superadmin role' });
    }

    user.role = role;
    await user.save();

    res.json({
      message: `User role updated to ${role} successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a single user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Protect admins/superadmins from being deleted via this endpoint
    if (['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ message: 'Cannot delete an admin/superadmin user' });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
