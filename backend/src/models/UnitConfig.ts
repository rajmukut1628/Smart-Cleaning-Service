import mongoose from 'mongoose';

const unitOptionSchema = new mongoose.Schema({
  label: { type: String, required: true }, // e.g., "500 sq ft", "1 Bedroom"
  value: { type: Number, required: true }, // Numeric value for calculation
});

const unitConfigSchema = new mongoose.Schema({
  unitType: { 
    type: String, 
    required: true, 
    unique: true 
  }, // e.g., "square", "unit", "others"
  label: { 
    type: String, 
    required: true 
  }, // Display name e.g., "Square Feet", "Unit (Rooms/Apartments)"
  options: [unitOptionSchema], // Array of predefined options
  allowCustom: { 
    type: Boolean, 
    default: true 
  }, // Allow custom input
  customPlaceholder: { 
    type: String, 
    default: 'Enter custom value' 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }, // Enable/disable this unit type
  order: { 
    type: Number, 
    default: 0 
  }, // Display order
}, {
  timestamps: true,
});

const UnitConfig = mongoose.model('UnitConfig', unitConfigSchema);

export default UnitConfig;
