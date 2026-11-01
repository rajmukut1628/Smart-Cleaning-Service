import {bulkTransition} from '../services/bookingTransitions';
import {validFutureSchedule,bookingSnapshots} from '../services/bookingRules';
import {scheduleLock,assertScheduleFree} from '../services/scheduling';
import { effectiveRole } from '../security/ownership';
import { removeAdministrator } from './ownershipController';
import ActivityLog from '../models/ActivityLog';
import { Request, Response } from 'express';
import Booking from '../models/Booking';
import User from '../models/User';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Extend Express Request interface to include user property
interface AuthenticatedRequest extends Request {
  user?: any;
  ownership?: any;
}

// @desc    Get all bookings
// @route   GET /api/admin/bookings
// @access  Private/Admin
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await Booking.find({})
      .populate('user', 'name email phone')
      .populate('service', 'name duration')
      .populate('worker', 'name email phone')
      .populate('workers', 'name email phone')
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
export const getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
  const { role } = req.query;
  const filter = role ? { role } : {};

  try {
    const users = await User.find(filter).select('-password');
    res.json(users.map(user => ({ ...(user.toObject ? user.toObject() : user), role: effectiveRole(user, req.ownership) })));
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

  let release:(()=>Promise<void>)|undefined;
  try {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if(['completed','cancelled'].includes(booking.status))return res.status(409).json({message:'Finished bookings cannot be reassigned'});
    if(new Set(workerIds).size!==workerIds.length||workerIds.length>50)return res.status(400).json({message:'Choose distinct workers'});
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

    release=await scheduleLock(['booking:'+bookingId,...workerIds.map((id:string)=>'worker:'+id)]);
    const fresh=await Booking.findById(bookingId);
    if(!fresh||String(fresh.updatedAt)!==String(booking.updatedAt))return res.status(409).json({message:'Booking changed. Refresh before assigning a team.'});
    await assertScheduleFree(String(bookingId),workerIds,booking.scheduledDate,booking.scheduledTime,requestedService?.duration||2);
    booking.workers = workerIds;
    booking.worker = workerIds[0] || undefined; // Legacy compatibility
    if(booking.status==='pending')booking.status = 'confirmed';

    const updatedBooking = await booking.save();
    res.json(updatedBooking);

  } catch (error) {
    console.error(error);
    res.status((error as any).status||500).json({ message: (error as any).status?(error as any).message:'Assignment could not be saved' });
  } finally {await release?.();}
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
 const {user,service,worker,address,squareFootage,scheduledDate,scheduledTime}=req.body;
 const units=Number(squareFootage);let release:(()=>Promise<void>)|undefined;
 if(!mongoose.isValidObjectId(user)||!mongoose.isValidObjectId(service)||(worker&&!mongoose.isValidObjectId(worker))||typeof address!=='string'||!address.trim()||!Number.isFinite(units)||units<=0||typeof scheduledTime!=='string'||!validFutureSchedule(scheduledDate,scheduledTime))return res.status(400).json({message:'Provide a customer, service, address, valid quantity and schedule'});
 try{
 const customer=await User.findOne({_id:user,role:'user'});const savedService=await (await import('../models/Service')).default.findById(service).populate('unitConfig');
 if(!customer||!savedService)return res.status(404).json({message:'Customer or service unavailable'});
 if(savedService.isCustom&&String(savedService.createdBy)!==String(user))return res.status(403).json({message:'This custom service belongs to another customer'});
 if(savedService.isCustom)return res.status(409).json({message:'Custom work must be booked by accepting the approved quote.'});
 const unitType=(savedService.unitConfig as any)?.unitType||(savedService.pricePerSqFt>0&&savedService.pricePerUnit===0?'square':'unit');
 const totalAmount=(savedService.basePrice||0)+units*(unitType==='square'?(savedService.pricePerSqFt||0):(savedService.pricePerUnit||0));
 const booking=new Booking({...bookingSnapshots(savedService,customer,units,unitType),user,service,worker:worker||undefined,workers:worker?[worker]:[],address:address.trim(),squareFootage:units,units,unitType,scheduledDate,scheduledTime,totalAmount,status:worker?'confirmed':'pending',paymentStatus:'pending'});
 if(worker){if(!await User.exists({_id:worker,role:'worker'}))return res.status(404).json({message:'Worker unavailable'});release=await scheduleLock(['worker:'+worker]);await assertScheduleFree(String(booking._id),[worker],scheduledDate,scheduledTime,savedService.duration||2);}
 await booking.save();res.status(201).json(booking);
 }catch(error:any){res.status(error.status||500).json({message:error.status?error.message:'Booking could not be created'});}finally{await release?.();}
};

// @desc    Get all admins
// @route   GET /api/admin/admins
// @access  Private/Admin
export const getAllAdmins = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).select('-password');
    res.json(admins.map(user => ({ ...(user.toObject ? user.toObject() : user), role: effectiveRole(user, req.ownership) })).filter(user => ['admin','superadmin'].includes(user.role)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new admin
// @route   POST /api/admin/admins
// @access  Private/Admin
export const createAdmin = async (req: Request, res: Response) => {
  const { name, password, phone, address } = req.body;
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

  if (typeof name !== 'string' || !name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof phone !== 'string' || !phone.trim() || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ message: 'Provide name, valid email, phone and an administrator password of at least 12 characters (up to 72 bytes).' });
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

    if (role && role !== user.role) return res.status(400).json({ message: 'Use Ownership & Access to remove an administrator. Ownership can only be transferred.' });
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
export const deleteAdmin = removeAdministrator;

// @desc    Bulk update booking status
// @route   PUT /api/admin/bookings/bulk-update
// @access  Private/Admin
async function handleBulkStatus(req:AuthenticatedRequest,res:Response,status:string){const ids=req.body.bookingIds;if(!Array.isArray(ids)||!ids.length||ids.length>100||new Set(ids).size!==ids.length||ids.some(id=>!mongoose.isValidObjectId(id))||!['pending','confirmed','in-progress','completed','cancelled'].includes(status))return res.status(400).json({message:'Choose up to 100 distinct valid bookings and a status'});try{const count=await bulkTransition(ids,status);res.json({message:'Updated '+count+' bookings',modifiedCount:count});}catch(error:any){res.status(error.status||500).json({message:error.status?error.message:'Booking updates could not be saved'});}}
export const bulkUpdateBookings=(req:AuthenticatedRequest,res:Response)=>handleBulkStatus(req,res,req.body.status);
export const bulkCancelBookings=(req:AuthenticatedRequest,res:Response)=>handleBulkStatus(req,res,'cancelled');

// @desc    Bulk delete users
// @route   DELETE /api/admin/users/bulk-delete
// @access  Private/Admin
export const bulkDeleteUsers = async (req: AuthenticatedRequest, res: Response) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || !userIds.length || userIds.length>100 || userIds.some(id=>!mongoose.isValidObjectId(id))) {
    return res.status(400).json({ message: 'Please provide userIds array' });
  }

  try {
    // Filter out admin users - don't delete them
    const users = await User.find({ _id: { $in: userIds } });
    const nonAdminUserIds = users
      .filter(u => !['admin','superadmin'].includes(u.role) && String(u._id) !== String(req.ownership?.ownerId))
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
 const {userIds,block}=req.body;if(!Array.isArray(userIds)||!userIds.length||userIds.length>100||userIds.some(id=>!mongoose.isValidObjectId(id))||typeof block!=='boolean')return res.status(400).json({message:'Provide valid account IDs and a block choice'});
 try{const users=await User.find({_id:{$in:userIds},role:{$in:['user','worker','blocked']}});let count=0;for(const user of users){if(String(user._id)===String(req.ownership?.ownerId))continue;if(block&&user.role!=='blocked'){const result=await User.updateOne({_id:user._id,role:user.role},{$set:{blockedFromRole:user.role,role:'blocked'},$inc:{sessionVersion:1}});count+=result.modifiedCount;}else if(!block&&user.role==='blocked'){const result=await User.updateOne({_id:user._id,role:'blocked'},{$set:{role:user.blockedFromRole||'user'},$unset:{blockedFromRole:1},$inc:{sessionVersion:1}});count+=result.modifiedCount;}req.app?.get('io')?.to('user:'+user._id).emit('session-revoked');req.app?.get('io')?.in('user:'+user._id).disconnectSockets(true);}res.json({message:(block?'Blocked ':'Unblocked ')+count+' accounts',modifiedCount:count});}catch{res.status(500).json({message:'Account access could not be updated'});}
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
          .populate('user', 'name email phone')
          .populate('service', 'name');
        filename = 'bookings_export.csv';
        break;
      case 'all':
        const users = await User.find({}).select('-password');
        const bookings = await Booking.find({})
          .populate('user', 'name email phone')
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

    if (isVerified !== true) return res.status(400).json({message:'Worker accounts remain active automatically'});
    worker.isVerified = true;
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

  const validRoles = ['user', 'worker', 'admin', 'blocked'];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (String(req.ownership?.ownerId) === String(user._id) || ['admin','superadmin'].includes(user.role)) return res.status(403).json({ message: 'Use Ownership & Access for administrator changes. The owner must transfer ownership before leaving.' });
    if (role === 'admin' && user.authProvider === 'google') return res.status(400).json({ message: 'Administrators must have password accounts.' });
    if (role === 'admin' && req.ownership?.revokedAdminIds?.some((id:any)=>String(id)===String(user._id))) return res.status(400).json({ message: 'This administrator access was revoked. Use a new dedicated administrator account.' });
    // Role protection logic
    // 1. Only superadmin can use this endpoint (enforced by middleware)
    // 2. Prevent a superadmin from demoting themselves (to avoid losing access)
    if (req.user._id.toString() === id && role !== 'superadmin') {
      return res.status(400).json({ message: 'You cannot demote yourself from superadmin role' });
    }

    user.role = role;
    user.sessionVersion = (user.sessionVersion || 0) + 1;
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
  if(!mongoose.isValidObjectId(id))return res.status(400).json({message:'Invalid account'});
  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Protect admins/superadmins from being deleted via this endpoint
    if (['admin', 'superadmin'].includes(user.role) || String(req.ownership?.ownerId) === String(user._id)) {
      return res.status(403).json({ message: 'Cannot delete an admin/superadmin user' });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
