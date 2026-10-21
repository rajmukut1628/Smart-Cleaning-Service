import { Request, Response } from 'express';
import Service from '../models/Service';
import { services as seedServicesData } from '../data/seedData';

// @desc    Fetch all services
// @route   GET /api/services
// @access  Public
export const getServices = async (req: Request, res: Response) => {
  try {
    const services = await Service.find({ isCustom: { $ne: true } }).populate('unitConfig');
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a service
// @route   POST /api/services
// @access  Private/Admin
export const createService = async (req: Request, res: Response) => {
  try {
    const { name, category, description, basePrice, pricePerSqFt, pricePerUnit, unitConfig, duration, image, features } = req.body;
    const service = new Service({
      name,
      category,
      description,
      basePrice,
      pricePerSqFt,
      pricePerUnit,
      unitConfig: unitConfig || undefined,
      duration,
      image,
      features,
    });
    const createdService = await service.save();
    res.status(201).json(createdService);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private/Admin
export const updateService = async (req: Request, res: Response) => {
  try {
    const { name, category, description, basePrice, pricePerSqFt, pricePerUnit, unitConfig, duration, image, features } = req.body;
    const service = await Service.findById(req.params.id);

    if (service) {
      service.name = name || service.name;
      service.category = category || service.category;
      service.description = description || service.description;
      service.basePrice = basePrice || service.basePrice;
      service.pricePerSqFt = pricePerSqFt !== undefined ? pricePerSqFt : service.pricePerSqFt;
      service.pricePerUnit = pricePerUnit !== undefined ? pricePerUnit : service.pricePerUnit;
      service.unitConfig = unitConfig || service.unitConfig;
      service.duration = duration || service.duration;
      service.image = image || service.image;
      service.features = features || service.features;

      const updatedService = await service.save();
      res.json(updatedService);
    } else {
      res.status(404).json({ message: 'Service not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private/Admin
export const deleteService = async (req: Request, res: Response) => {
  try {
    const service = await Service.findById(req.params.id);

    if (service) {
      await service.deleteOne(); // or service.remove() for older mongoose versions
      res.json({ message: 'Service removed' });
    } else {
      res.status(404).json({ message: 'Service not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};


// @desc    Seed the database with initial service data
// @route   POST /api/services/seed
// @access  Public (for development purposes)
export const seedServices = async (req: Request, res: Response) => {
  try {
    // Clear existing services
    await Service.deleteMany({});

    // Insert the seed data
    const createdServices = await Service.insertMany(seedServicesData);

    res.status(201).json(createdServices);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
