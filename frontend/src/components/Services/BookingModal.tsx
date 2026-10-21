import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { Service } from '../../types';

interface UnitOption {
  label: string;
  value: number;
  _id?: string;
}

interface UnitConfigType {
  _id: string;
  unitType: string;
  label: string;
  options: UnitOption[];
  allowCustom: boolean;
  customPlaceholder: string;
  isActive: boolean;
  order: number;
}

interface BookingModalProps {
  service: Service;
  onClose: () => void;
}

export default function BookingModal({ service, onClose }: BookingModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    address: '',
    areaUnit: '',
    squareFootage: '1',
    scheduledDate: '',
    scheduledTime: '',
    specialInstructions: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUnitType, setSelectedUnitType] = useState<'predefined' | 'custom'>('predefined');
  const [unitConfigs, setUnitConfigs] = useState<UnitConfigType[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  // Fetch unit configurations on component mount
  useEffect(() => {
    const fetchUnitConfigs = async () => {
      try {
        const response = await axios.get('/api/unit-configs');
        setUnitConfigs(response.data);

        // Find if service has a linked unitConfig and set it as default areaUnit
        if (service.unitConfig) {
          const linkedConfig = response.data.find((c: any) => c._id === service.unitConfig || c._id === (service.unitConfig as any)._id);
          if (linkedConfig) {
            setFormData(prev => ({ ...prev, areaUnit: linkedConfig.unitType }));
          }
        } else if (response.data.length > 0) {
          setFormData(prev => ({ ...prev, areaUnit: response.data[0].unitType }));
        }
      } catch (err) {
        console.error('Failed to fetch unit configurations:', err);
      } finally {
        setLoadingConfigs(false);
      }
    };

    fetchUnitConfigs();
  }, [service.unitConfig]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'areaUnit') {
      setFormData(prev => ({ ...prev, [name]: value, squareFootage: '' }));
      setSelectedUnitType('predefined');
    } else if (name === 'squareFootage' && value === 'custom') {
      setSelectedUnitType('custom');
      setFormData(prev => ({ ...prev, squareFootage: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const calculateTotal = () => {
    if (!service) return 0;

    const units = Number(formData.squareFootage) || 0;
    const basePrice = service.basePrice || 0;

    // Check if it's a Square Feet based service or Unit based
    const unitConfig = unitConfigs.find(c => c.unitType === formData.areaUnit);

    if (unitConfig?.unitType === 'square') {
      return basePrice + (units * (service.pricePerSqFt || 0));
    } else {
      // For Car Wash (unit based) or others
      return basePrice + (units * ((service as any).pricePerUnit || 0));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const bookingData = {
      unitType: formData.areaUnit,
      serviceId: service.id || (service as any)._id,
      address: formData.address,
      squareFootage: parseInt(formData.squareFootage) || 0,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      specialInstructions: formData.specialInstructions,
    };

    try {
      await axios.post('/api/bookings', bookingData);
      alert('Booking created successfully! You can view it in your dashboard.');
      onClose();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to create booking. Please try again.';
      setError(message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!service) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Book {service.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Your Information</h3>
            <div className="text-sm text-gray-700">
              <p><span className="font-medium">Name:</span> {user?.name}</p>
              <p><span className="font-medium">Email:</span> {user?.email}</p>
            </div>
          </div>

          <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">Pay cash after the service. Your payment status updates when an administrator confirms receipt.</p>
          {/* Service Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Service Details</h3>
            {service.pricePerSqFt > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span>Base Price: ৳{service.basePrice.toLocaleString()}</span>
                <span>Per Sq Ft: ৳{service.pricePerSqFt}</span>
              </div>
            ) : (service as any).pricePerUnit > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span>Base Price: ৳{service.basePrice.toLocaleString()}</span>
                <span>Per Unit: ৳{(service as any).pricePerUnit}</span>
              </div>
            ) : (
              <div className="text-sm">
                <span className="font-medium">Fixed Price: ৳{service.basePrice.toLocaleString()}</span>
              </div>
            )}
          </div>
          {/* Area/Quantity Unit Selection */}
          {(service.pricePerSqFt > 0 || (service as any).pricePerUnit > 0 || service.unitConfig) && (
            <>
              {loadingConfigs ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : (
                <>
                  {/* Auto-selected Area/Quantity Section */}
                  {unitConfigs.map((config) => {
                    if (config.unitType !== formData.areaUnit) return null;

                    return (
                      <div key={config._id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          {config.label}
                        </label>

                        {config.unitType === 'square' ? (
                          /* Standard input for Square feet */
                          <div className="space-y-2">
                            <input
                              name="squareFootage"
                              type="number"
                              min="1"
                              value={formData.squareFootage}
                              onChange={(e) => setFormData(prev => ({ ...prev, squareFootage: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                              placeholder={config.customPlaceholder || "Enter area size"}
                            />
                          </div>
                        ) : (
                          /* Smart Quantity Selector for Units (Car Wash, etc.) */
                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                              {[1, 2, 3, 4, 5, 10].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, squareFootage: String(num) }));
                                    setSelectedUnitType('predefined');
                                  }}
                                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${formData.squareFootage === String(num) && selectedUnitType === 'predefined'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-500'
                                    }`}
                                >
                                  {num}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUnitType('custom');
                                }}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedUnitType === 'custom'
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-500'
                                  }`}
                              >
                                Custom
                              </button>
                            </div>

                            {/* Custom Input Field */}
                            {(selectedUnitType === 'custom' || !([1, 2, 3, 4, 5, 10].includes(Number(formData.squareFootage)))) && (
                              <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <input
                                  name="squareFootage"
                                  type="number"
                                  min="1"
                                  value={formData.squareFootage}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData(prev => ({ ...prev, squareFootage: val }));
                                    if (![1, 2, 3, 4, 5, 10].includes(Number(val))) {
                                      setSelectedUnitType('custom');
                                    }
                                  }}
                                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                                  placeholder="Qty"
                                />
                                <span className="text-sm text-gray-600">{config.label}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
          {/* Form Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Address</label>
            <textarea
              name="address"
              required
              value={formData.address}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Enter complete address with area and landmarks"
            />
          </div>



          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
              <input
                name="scheduledDate"
                type="date"
                required
                value={formData.scheduledDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
              <select
                name="scheduledTime"
                required
                value={formData.scheduledTime}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select time</option>
                <option value="09:00">09:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="14:00">02:00 PM</option>
                <option value="15:00">03:00 PM</option>
                <option value="16:00">04:00 PM</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions (Optional)</label>
            <textarea
              name="specialInstructions"
              value={formData.specialInstructions}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Any specific requirements or instructions"
            />
          </div>

          {/* Total Calculation */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
              <span className="font-semibold text-lg">Service Price:</span>
              <span className="font-bold text-xl text-blue-600">
                ৳{calculateTotal().toLocaleString()}
              </span>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}

          <div className="flex space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Confirming...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}