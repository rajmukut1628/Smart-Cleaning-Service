import {validFutureSchedule,bookingSnapshots} from '../services/bookingRules';
import { isUploadedImage, uploadedImageExists } from '../utils/imageStorage';
import { Request, Response } from 'express';
import Booking from '../models/Booking';
import Service from '../models/Service'; // Needed to calculate price

// Extend Express Request interface to include user property
interface AuthenticatedRequest extends Request {
  user?: any;
}

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req: AuthenticatedRequest, res: Response) => {
  const {
    serviceId,
    address,
    squareFootage, // This will be treated as units
    scheduledDate,
    scheduledTime,
    specialInstructions,
  } = req.body;

  if (!serviceId || !address || !scheduledDate || !scheduledTime) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    const service = await Service.findById(serviceId).populate('unitConfig');
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // --- Dynamic Price Calculation ---
    let totalAmount = service.basePrice || 0;
    let unitType = 'unit'; // Default to unit based pricing for better compatibility

    if (service.unitConfig) {
      const config = service.unitConfig as any;
      unitType = config.unitType;
    } else if (service.pricePerSqFt > 0 && (service as any).pricePerUnit === 0) {
      // If no config but pricePerSqFt is the only one set, treat as square
      unitType = 'square';
    }

    // Pricing comes from the saved service, never a customer-supplied unit override.
    const units = Number(squareFootage);
    if (!Number.isFinite(units) || units <= 0 || !validFutureSchedule(scheduledDate,scheduledTime)) return res.status(400).json({ message: 'Valid quantity, date and time are required' });
    if (service.isCustom && service.createdBy?.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'This custom service belongs to another customer' });

    if (service.isCustom) return res.status(409).json({ message: 'Custom work requires an approved quote. Accept your quote from Custom cleaning requests.' });

    // Calculation logic mirroring frontend:
    if (unitType === 'square') {
      totalAmount += (units * (service.pricePerSqFt || 0));
    } else {
      // Default to pricePerUnit for 'unit', 'others', or missing config cases
      totalAmount += (units * (service.pricePerUnit || 0));
    }

    const booking = new Booking({
      ...bookingSnapshots(service,req.user,units,unitType),
      user: req.user._id,
      service: serviceId,
      address,
      squareFootage, // for compatibility
      units: squareFootage,
      unitType,
      scheduledDate,
      scheduledTime,
      specialInstructions,
      totalAmount,
    });

    const createdBooking = await booking.save();
    res.status(201).json(createdBooking);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};


// @desc    Get logged in user's bookings
// @route   GET /api/bookings/user
// @access  Private
export const getUserBookings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('user', 'name email phone')
      .populate('service', 'name') // Populate service details
      .populate('worker', 'name email phone') // Added: populate primary worker
      .populate('workers', 'name email phone') // Added: populate all workers
      .sort({ scheduledDate: -1 }); // Sort by most recent

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Upload before images for a booking
// @route   POST /api/bookings/:id/before-images
// @access  Private (Worker)
export const uploadBeforeImages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { images } = req.body; // Array of image URLs
    if (!Array.isArray(images) || images.length > 20 || images.some(image => !isUploadedImage(image))) return res.status(400).json({ message: 'Provide up to 20 uploaded image paths' });

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is the booking owner or assigned worker
    const isOwner = booking.user?.toString() === req.user._id.toString();
    const isWorker = booking.worker?.toString() === req.user._id.toString() ||
      (booking as any).workers?.some((id: any) => id.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isOwner && !isWorker && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to upload images for this booking' });
    }

    if (['completed','cancelled'].includes(booking.status)) return res.status(409).json({ message: 'Photos cannot be changed after a job is finished or cancelled.' });
    if (booking.status === 'in-progress' && !images.length) return res.status(409).json({ message: 'Keep at least one before photo while work is in progress.' });
    if (!(await Promise.all(images.map(uploadedImageExists))).every(Boolean)) return res.status(400).json({ message: 'One or more photos are missing from image storage. Upload them again.' });
    booking.beforeImages = images;
    await booking.save();

    res.json({ message: 'Before images uploaded successfully', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Upload after images for a booking
// @route   POST /api/bookings/:id/after-images
// @access  Private (Worker)
export const uploadAfterImages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { images } = req.body; // Array of image URLs
    if (!Array.isArray(images) || images.length > 20 || images.some(image => !isUploadedImage(image))) return res.status(400).json({ message: 'Provide up to 20 uploaded image paths' });

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is the booking owner or assigned worker
    const isOwner = booking.user?.toString() === req.user._id.toString();
    const isWorker = booking.worker?.toString() === req.user._id.toString() || booking.workers.some(id => id.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isOwner && !isWorker && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to upload images for this booking' });
    }

    if (booking.status !== 'in-progress') return res.status(409).json({ message: 'After photos can only be uploaded while the job is in progress.' });
    if (!(await Promise.all(images.map(uploadedImageExists))).every(Boolean)) return res.status(400).json({ message: 'One or more photos are missing from image storage. Upload them again.' });
    booking.afterImages = images;
    await booking.save();

    res.json({ message: 'After images uploaded successfully', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Repeat a booking
// @route   POST /api/bookings/:id/repeat
// @access  Private
export const repeatBooking = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const originalBooking = await Booking.findById(id);
    if (!originalBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user owns this booking
    if (originalBooking.user?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to repeat this booking' });
    }

    // Check if booking is completed
    if (originalBooking.status !== 'completed') {
      return res.status(400).json({ message: 'Can only repeat completed bookings' });
    }

    if(!validFutureSchedule(req.body.scheduledDate,req.body.scheduledTime))return res.status(400).json({message:'Choose a future date and time for the repeat booking'});
    req.body={serviceId:String(originalBooking.service),address:originalBooking.address,squareFootage:req.body.squareFootage??originalBooking.squareFootage,scheduledDate:req.body.scheduledDate,scheduledTime:req.body.scheduledTime,specialInstructions:originalBooking.specialInstructions};
    return createBooking(req,res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};


