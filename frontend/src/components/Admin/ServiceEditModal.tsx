import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Service } from '../../types';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../../config/apiConfig';
import toast from 'react-hot-toast';

interface ServiceEditModalProps {
  service?: Service | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ServiceEditModal({ service, onClose, onSuccess }: ServiceEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    basePrice: '',
    pricePerSqFt: '',
    pricePerUnit: '',
    unitConfig: '',
    duration: '',
    image: '',
    features: '', // Comma-separated string
  });
  const [unitConfigs, setUnitConfigs] = useState<{_id:string;unitType:string;label:string}[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<'sqft-based' | 'fixed-price'>('sqft-based');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = Boolean(service);

  useEffect(() => {
    const fetchUnitConfigs = async () => {
      try {
        const res = await axios.get('/api/unit-configs?isActive=true');
        setUnitConfigs(res.data);
      } catch (err) {
        console.error('Failed to fetch unit configs:', err);
      }
    };
    fetchUnitConfigs();
  }, []);

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        category: service.category,
        description: service.description,
        basePrice: String(service.basePrice),
        pricePerSqFt: String(service.pricePerSqFt),
        duration: String(service.duration),
        image: service.image,
        features: service.features.join(', '),
        pricePerUnit: String(service.pricePerUnit || ''),
        unitConfig: (typeof service.unitConfig==='object'?service.unitConfig?._id:service.unitConfig) || '',
      });
      setServiceType((typeof service.unitConfig==='object'&&service.unitConfig?.unitType==='square')||(!service.unitConfig&&service.pricePerSqFt>0&&service.pricePerUnit===0)?'sqft-based':'fixed-price');
    } else {
      setFormData({
        name: '',
        category: '',
        description: '',
        basePrice: '',
        pricePerSqFt: '',
        pricePerUnit: '',
        unitConfig: '',
        duration: '',
        image: '',
        features: '',
      });
    }
  }, [service]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPG, PNG, GIF, WebP)');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.onerror = () => {
        toast.error('Error reading image file');
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    let imageUrl = formData.image;

    if (imageFile) {
      const uploadFormData = new FormData();
      uploadFormData.append('file', imageFile);

      try {
        const uploadRes = await axios.post('/api/upload', uploadFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        imageUrl = uploadRes.data.filePath;
      } catch (err: unknown) {
        const errorMsg = (axios.isAxiosError<{message:string}>(err)?err.response?.data.message:undefined) || 'Image upload failed. Please try again.';
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }
    }

    const serviceData = {
      ...formData,
      image: imageUrl || '',
      basePrice: parseFloat(formData.basePrice),
      pricePerSqFt: serviceType === 'fixed-price' ? 0 : parseFloat(formData.pricePerSqFt),
      pricePerUnit: serviceType === 'fixed-price' ? parseFloat(formData.pricePerUnit) || 0 : 0,
      unitConfig: serviceType === 'fixed-price' ? (unitConfigs.find(c=>c._id===formData.unitConfig)?.unitType==='square'?null:formData.unitConfig||null) : (typeof service?.unitConfig==='object'&&service.unitConfig?.unitType==='square'?service.unitConfig._id:null),
      duration: parseFloat(formData.duration),
      features: formData.features.split(',').map(f => f.trim()).filter(f => f),
    };

    try {
      if (isEditMode && service) {
        await axios.put(`/api/services/${service.id}`, serviceData);
      } else {
        await axios.post('/api/services', serviceData);
      }
      toast.success(`Service ${isEditMode ? 'updated' : 'created'} successfully!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError((axios.isAxiosError<{message:string}>(err)?err.response?.data.message:undefined) || 'An error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{isEditMode ? 'Edit Service' : 'Create New Service'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="mt-1 w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <input type="text" name="category" value={formData.category} onChange={handleInputChange} required className="mt-1 w-full px-3 py-2 border rounded-md" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea name="description" value={formData.description} onChange={handleInputChange} required className="mt-1 w-full px-3 py-2 border rounded-md" rows={3}></textarea>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">Service Pricing Type</label>
            <div className="flex gap-4">
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
                  📐 Square Feet Based <span className="text-gray-500">(e.g., Cleaning)</span>
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
                  💰 Unit/Quantity Based <span className="text-gray-500">(e.g., Car Wash)</span>
                </span>
              </label>
            </div>
          </div>

          {serviceType === 'fixed-price' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit Type Configuration</label>
                <select
                  name="unitConfig"
                  value={formData.unitConfig}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                >
                  <option value="">No unit config (Simple fixed price)</option>
                  {unitConfigs.filter(config=>config.unitType!=='square').map(config => (
                    <option key={config._id} value={config._id}>{config.label}</option>
                  ))}
                </select>
                <p className="text-xs text-blue-600 mt-1">This defines the input label (e.g., "Number of Cars")</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price Per Unit (৳)</label>
                <input
                  type="number"
                  name="pricePerUnit"
                  value={formData.pricePerUnit}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                  placeholder="e.g. 500 per car"
                />
              </div>
            </div>
          )}

          <div className={`grid grid-cols-1 ${serviceType === 'sqft-based' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {serviceType === 'fixed-price' ? 'Fixed Base Price (৳)' : 'Base Price (৳)'}
              </label>
              <input type="number" name="basePrice" value={formData.basePrice} onChange={handleInputChange} required className="mt-1 w-full px-3 py-2 border rounded-md" />
            </div>

            {serviceType === 'sqft-based' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Price/SqFt (৳)</label>
                <input type="number" name="pricePerSqFt" value={formData.pricePerSqFt} onChange={handleInputChange} required className="mt-1 w-full px-3 py-2 border rounded-md" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Duration (Hours)</label>
              <input type="number" name="duration" value={formData.duration} onChange={handleInputChange} required className="mt-1 w-full px-3 py-2 border rounded-md" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Image</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {imagePreview ? (
                <div className="relative h-48">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-lg bg-blue-50 p-3" />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(''); }} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full"><XMarkIcon className="h-4 w-4" /></button>
                </div>
              ) : formData.image ? (
                <div className="relative h-48">
                  <img src={formData.image.startsWith('/') ? `${API_BASE_URL}${formData.image}` : formData.image} alt="Current" className="w-full h-full object-contain rounded-lg bg-blue-50 p-3" />
                </div>
              ) : (
                <div className="text-center py-4">
                  <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto" />
                  <p className="mt-2 text-sm text-slate-500">Choose a photo for this service</p>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-blue-100 pt-3">
                <p className="text-xs text-slate-500">Your full photo will be displayed without cropping.</p>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" id="image-upload" />
                <label htmlFor="image-upload" className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">{imagePreview || formData.image ? 'Replace image' : 'Upload image'}</label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Features (comma-separated)</label>
            <textarea name="features" value={formData.features} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border rounded-md" rows={2}></textarea>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</p>}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center">
              {isLoading ? 'Saving...' : 'Save Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
