import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface CustomServiceModalProps {
  onClose: () => void;
  onServiceCreated: () => void;
}

interface UnitConfig {
  _id: string;
  unitType: string;
  label: string;
  isActive: boolean;
}

export default function CustomServiceModal({ onClose, onServiceCreated }: CustomServiceModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    customCategory: '', // Add custom category field
    description: '',
    basePrice: '',
    pricePerSqFt: '',
    duration: '',
    features: '',
  });
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceType, setServiceType] = useState<'sqft-based' | 'fixed-price'>('sqft-based');
  const [unitConfigs, setUnitConfigs] = useState<UnitConfig[]>([]);
  const [selectedUnitConfig, setSelectedUnitConfig] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    'residential',
    'commercial',
    'industrial',
    'specialized',
    'sanitization',
    'custom', // Add custom category option
  ];

  // Fetch unit configurations
  useEffect(() => {
    const fetchUnitConfigs = async () => {
      try {
        const response = await axios.get('/api/unit-configs?isActive=true');
        setUnitConfigs(response.data);
        if (response.data.length > 0) {
          setSelectedUnitConfig(response.data[0]._id);
        }
      } catch (error) {
        console.error('Failed to fetch unit configs:', error);
      }
    };
    fetchUnitConfigs();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('File selected:', file);
    console.log('File input element:', e.target);

    if (file) {
      console.log('File type:', file.type, 'File size:', file.size);

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPG, PNG, GIF, WebP)');
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      console.log('Setting image and creating preview...');
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        console.log('Image preview set successfully');
      };
      reader.onerror = () => {
        toast.error('Error reading image file');
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } else {
      console.log('No file selected');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.category || !formData.description ||
      !formData.basePrice || !formData.pricePerSqFt || !formData.duration || !image) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check custom category
    if (formData.category === 'custom' && !formData.customCategory.trim()) {
      toast.error('Please enter a custom category name');
      return;
    }

    if (parseFloat(formData.basePrice) <= 0 || parseFloat(formData.pricePerSqFt) <= 0 || parseFloat(formData.duration) <= 0) {
      toast.error('Prices and duration must be positive numbers');
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('category', formData.category === 'custom' ? formData.customCategory : formData.category);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('basePrice', formData.basePrice);
      formDataToSend.append('pricePerSqFt', serviceType === 'fixed-price' ? '0' : formData.pricePerSqFt);
      formDataToSend.append('duration', formData.duration);
      formDataToSend.append('features', formData.features);
      formDataToSend.append('image', image);

      await axios.post('/api/services/custom', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Custom service created successfully!');
      onServiceCreated();
      onClose();
    } catch (error: unknown) {
      console.error('Error creating custom service:', error);
      const message = (axios.isAxiosError<{message:string}>(error)?error.response?.data.message:undefined)||'Failed to create custom service';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Create Custom Service</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Image *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Service preview"
                    className="w-full h-48 object-contain rounded-lg bg-blue-50 p-3"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      setImagePreview('');
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-sm text-gray-600 mb-4">
                    Upload a service image (JPG, PNG, GIF, WebP)
                  </div>
                  <input
                    type="file"
                    id="service-image"
                    ref={fileInputRef}
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                    required
                  />
                  <label
                    htmlFor="service-image"
                    className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block"
                    onClick={() => console.log('Label clicked')}
                  >
                    Choose Image
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Manual trigger clicked');
                      fileInputRef.current?.click();
                    }}
                    className="ml-2 cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block"
                  >
                    Test Upload
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Deep Carpet Cleaning"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Category Input */}
          {formData.category === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Category Name *
              </label>
              <input
                type="text"
                name="customCategory"
                value={formData.customCategory}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your custom category name"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe your custom cleaning service..."
              required
            />
          </div>

          {/* Service Type Selection */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">Service Pricing Type</label>
            <div className="flex gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="serviceType"
                  value="sqft-based"
                  checked={serviceType === 'sqft-based'}
                  onChange={(e) => setServiceType(e.target.value as 'sqft-based' | 'fixed-price')}
                  className="mr-2"
                />
                <span className="text-sm">
                  📐 Square Feet Based <span className="text-gray-500">(e.g., Deep Cleaning, Regular Cleaning)</span>
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="serviceType"
                  value="fixed-price"
                  checked={serviceType === 'fixed-price'}
                  onChange={(e) => setServiceType(e.target.value as 'sqft-based' | 'fixed-price')}
                  className="mr-2"
                />
                <span className="text-sm">
                  💰 Fixed Price <span className="text-gray-500">(e.g., Car Wash, Toilet Clean)</span>
                </span>
              </label>
            </div>
          </div>

          {/* Unit Configuration Selection - Only for sqft-based services */}
          {serviceType === 'sqft-based' && unitConfigs.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Type *
              </label>
              <select
                value={selectedUnitConfig}
                onChange={(e) => setSelectedUnitConfig(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {unitConfigs.map((config) => (
                  <option key={config._id} value={config._id}>
                    {config.label} ({config.unitType})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select the unit type customers will use when booking this service
              </p>
            </div>
          )}

          {/* Pricing Information */}
          <div className={`grid grid-cols-1 ${serviceType === 'sqft-based' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {serviceType === 'fixed-price' ? 'Fixed Price ($) *' : 'Base Price ($) *'}
              </label>
              <input
                type="number"
                name="basePrice"
                value={formData.basePrice}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="50.00"
                required
              />
            </div>

            {/* Only show Price/SqFt for sqft-based services */}
            {serviceType === 'sqft-based' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price per Sq Ft ($) *
                </label>
                <input
                  type="number"
                  name="pricePerSqFt"
                  value={formData.pricePerSqFt}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.50"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (hours) *
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                min="0.5"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="2"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Features (comma-separated)
            </label>
            <input
              type="text"
              name="features"
              value={formData.features}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Eco-friendly products, Professional equipment, Satisfaction guarantee"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
