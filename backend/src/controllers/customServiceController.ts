import { storeImage, ImageStorageError } from '../utils/imageStorage';
import { Request, Response } from 'express';
import Service from '../models/Service';

// Extend Express Request interface to include user property
interface AuthenticatedRequest extends Request {
  user?: any;
}

// @desc    Create a custom service
// @route   POST /api/services/custom
// @access  Private (Users only)
export const createCustomService = async (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    category,
    description,
    basePrice,
    pricePerSqFt,
    duration,
    features,
  } = req.body;

  // Validate required fields
  if (!name || !category || !description || basePrice === undefined || pricePerSqFt === undefined || !duration) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  // Validate numeric fields
  if (![basePrice, pricePerSqFt, duration].every(v => Number.isFinite(Number(v))) || Number(basePrice) < 0 || Number(pricePerSqFt) < 0 || Number(duration) <= 0) {
    return res.status(400).json({ message: 'Prices and duration must be positive numbers' });
  }

  // Check if user already has a service with this name
  const existingService = await Service.findOne({
    name,
    createdBy: req.user._id,
    isCustom: true
  });

  if (existingService) {
    return res.status(400).json({ message: 'You already have a custom service with this name' });
  }

  try {
    // Handle image upload
    let image = '';
    if (req.file) {
      image = await storeImage(req.file);
    } else {
      return res.status(400).json({ message: 'Service image is required' });
    }

    const service = new Service({
      name,
      category,
      description,
      basePrice: Number(basePrice),
      pricePerSqFt: Number(pricePerSqFt),
      unitConfig: req.body.unitConfig || undefined,
      duration: Number(duration),
      image,
      features: features ? features.split(',').map((f: string) => f.trim()) : [],
      isCustom: true,
      createdBy: req.user._id,
    });

    const createdService = await service.save();
    res.status(201).json(createdService);
  } catch (error) {
    console.error(error);
    res.status(error instanceof ImageStorageError ? error.status : 500).json({ message: error instanceof ImageStorageError ? error.message : 'Server Error' });
  }
};

// @desc    Get user's custom services
// @route   GET /api/services/custom
// @access  Private
export const getUserCustomServices = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const services = await Service.find({
      createdBy: req.user._id,
      isCustom: true
    }).sort({ createdAt: -1 });

    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(error instanceof ImageStorageError ? error.status : 500).json({ message: error instanceof ImageStorageError ? error.message : 'Server Error' });
  }
};

// @desc    Update custom service
// @route   PUT /api/services/custom/:id
// @access  Private (Service owner only)
export const updateCustomService = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Check if user owns this service
    if (service.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this service' });
    }

    // Check if it's a custom service
    if (!service.isCustom) {
      return res.status(403).json({ message: 'Cannot update system services' });
    }

    const {
      name,
      category,
      description,
      basePrice,
      pricePerSqFt,
      duration,
      features,
    } = req.body;

    // Validate required fields
    if (!name || !category || !description || !basePrice || !pricePerSqFt || !duration) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Validate numeric fields
    if (basePrice <= 0 || pricePerSqFt <= 0 || duration <= 0) {
      return res.status(400).json({ message: 'Prices and duration must be positive numbers' });
    }

    // Handle image upload
    let image = service.image;
    if (req.file) {
      image = await storeImage(req.file);
    }

    service.name = name;
    service.category = category;
    service.description = description;
    service.basePrice = Number(basePrice);
    service.pricePerSqFt = Number(pricePerSqFt);
    service.duration = Number(duration);
    service.image = image;
    service.features = features ? features.split(',').map((f: string) => f.trim()) : [];

    const updatedService = await service.save();
    res.json(updatedService);
  } catch (error) {
    console.error(error);
    res.status(error instanceof ImageStorageError ? error.status : 500).json({ message: error instanceof ImageStorageError ? error.message : 'Server Error' });
  }
};

// @desc    Delete custom service
// @route   DELETE /api/services/custom/:id
// @access  Private (Service owner only)
export const deleteCustomService = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Check if user owns this service
    if (service.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this service' });
    }

    // Check if it's a custom service
    if (!service.isCustom) {
      return res.status(403).json({ message: 'Cannot delete system services' });
    }

    await Service.findByIdAndDelete(req.params.id);
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(error instanceof ImageStorageError ? error.status : 500).json({ message: error instanceof ImageStorageError ? error.message : 'Server Error' });
  }
};