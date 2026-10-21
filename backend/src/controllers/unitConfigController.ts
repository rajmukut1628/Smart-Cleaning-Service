import { Request, Response } from 'express';
import UnitConfig from '../models/UnitConfig';

// Get all unit configurations
export const getUnitConfigs = async (req: Request, res: Response) => {
  try {
    const configs = await UnitConfig.find({ isActive: true }).sort({ order: 1 });
    res.json(configs);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch unit configurations', error: error.message });
  }
};

// Get single unit configuration
export const getUnitConfigById = async (req: Request, res: Response) => {
  try {
    const config = await UnitConfig.findById(req.params.id);
    if (!config) {
      return res.status(404).json({ message: 'Unit configuration not found' });
    }
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch unit configuration', error: error.message });
  }
};

// Create new unit configuration (Admin only)
export const createUnitConfig = async (req: Request, res: Response) => {
  try {
    const { unitType, label, options, allowCustom, customPlaceholder, isActive, order } = req.body;

    const existingConfig = await UnitConfig.findOne({ unitType });
    if (existingConfig) {
      return res.status(400).json({ message: 'Unit type already exists' });
    }

    const config = new UnitConfig({
      unitType,
      label,
      options,
      allowCustom,
      customPlaceholder,
      isActive,
      order,
    });

    await config.save();
    res.status(201).json(config);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create unit configuration', error: error.message });
  }
};

// Update unit configuration (Admin only)
export const updateUnitConfig = async (req: Request, res: Response) => {
  try {
    const { unitType, label, options, allowCustom, customPlaceholder, isActive, order } = req.body;

    const config = await UnitConfig.findByIdAndUpdate(
      req.params.id,
      { unitType, label, options, allowCustom, customPlaceholder, isActive, order },
      { new: true, runValidators: true }
    );

    if (!config) {
      return res.status(404).json({ message: 'Unit configuration not found' });
    }

    res.json(config);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update unit configuration', error: error.message });
  }
};

// Delete unit configuration (Admin only)
export const deleteUnitConfig = async (req: Request, res: Response) => {
  try {
    const config = await UnitConfig.findByIdAndDelete(req.params.id);
    if (!config) {
      return res.status(404).json({ message: 'Unit configuration not found' });
    }
    res.json({ message: 'Unit configuration deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete unit configuration', error: error.message });
  }
};

// Seed default unit configurations
export const seedUnitConfigs = async (req: Request, res: Response) => {
  try {
    const existingConfigs = await UnitConfig.find();
    if (existingConfigs.length > 0) {
      return res.status(400).json({ message: 'Unit configurations already exist' });
    }

    const defaultConfigs = [
      {
        unitType: 'square',
        label: 'Square Feet',
        options: [
          { label: '500 sq ft', value: 500 },
          { label: '750 sq ft', value: 750 },
          { label: '1000 sq ft', value: 1000 },
          { label: '1500 sq ft', value: 1500 },
          { label: '2000 sq ft', value: 2000 },
          { label: '2500 sq ft', value: 2500 },
          { label: '3000 sq ft', value: 3000 },
          { label: '3500 sq ft', value: 3500 },
          { label: '4000 sq ft', value: 4000 },
          { label: '5000 sq ft', value: 5000 },
        ],
        allowCustom: true,
        customPlaceholder: 'Or enter custom area in square feet',
        isActive: true,
        order: 1,
      },
      {
        unitType: 'unit',
        label: 'Unit (Rooms/Apartments)',
        options: [
          { label: '1 Unit (1 Bedroom)', value: 1000 },
          { label: '2 Units (2 Bedrooms)', value: 1500 },
          { label: '3 Units (3 Bedrooms)', value: 2000 },
          { label: '4 Units (4 Bedrooms)', value: 2500 },
          { label: 'Full Apartment', value: 3000 },
        ],
        allowCustom: true,
        customPlaceholder: 'Or enter custom unit value',
        isActive: true,
        order: 2,
      },
      {
        unitType: 'others',
        label: 'Others',
        options: [],
        allowCustom: true,
        customPlaceholder: 'Enter your custom measurement value',
        isActive: true,
        order: 3,
      },
    ];

    await UnitConfig.insertMany(defaultConfigs);
    res.status(201).json({ message: 'Default unit configurations created successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to seed unit configurations', error: error.message });
  }
};
