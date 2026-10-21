import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  _id: string;
  name: string;
}

interface Service {
  _id: string;
  name: string;
  basePrice: number;
  pricePerSqFt: number;
  pricePerUnit: number;
  unitConfig?: UnitConfig;
}

interface Worker {
  _id: string;
  name: string;
}

interface UnitOption {
  label: string;
  value: number;
}

interface UnitConfig {
  _id: string;
  unitType: string;
  label: string;
  options: UnitOption[];
  allowCustom: boolean;
  customPlaceholder: string;
  isActive: boolean;
}

interface CreateBookingModalProps {
  onBookingCreated: () => void;
}

const CreateBookingModal: React.FC<CreateBookingModalProps> = ({ onBookingCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  // Form state
  const [userId, setUserId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [address, setAddress] = useState('');
  const [squareFootage, setSquareFootage] = useState(1);
  const [selectedUnitType, setSelectedUnitType] = useState('predefined');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [totalAmount, setTotalAmount] = useState(0);
  
  // New User state
  const [isNewUser, setIsNewUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchDataForModal = async () => {
        try {
          setFetchError(null);
          const [usersRes, servicesRes, workersRes] = await Promise.all([
            axios.get('/api/admin/users?role=user'),
            axios.get('/api/services'),
            axios.get('/api/admin/workers'),
          ]);
          setUsers(usersRes.data);
          setServices(servicesRes.data);
          setWorkers(workersRes.data);
        } catch (err) {
          setFetchError('Failed to load necessary data.');
          console.error(err);
        }
      };
      fetchDataForModal();
    }
  }, [isOpen]);

  // Derived state for the selected service's unit config
  const selectedService = services.find(s => s._id === serviceId);
  const currentUnitConfig = selectedService?.unitConfig;

  useEffect(() => {
    if (selectedService) {
      let amount = selectedService.basePrice || 0;
      const unitType = currentUnitConfig?.unitType || 'square';

      if (unitType === 'square') {
        amount += (selectedService.pricePerSqFt * squareFootage);
      } else {
        amount += (selectedService.pricePerUnit * squareFootage);
      }
      setTotalAmount(amount);
    } else {
      setTotalAmount(0);
    }
  }, [serviceId, squareFootage, selectedService, currentUnitConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalUserId = userId;

      // If it's a new user, create the user account first
      if (isNewUser) {
        try {
          const userRes = await axios.post('/api/auth/register', {
            name: newName,
            email: newEmail,
            phone: newPhone,
            password: 'password123' // Default password
          });
          finalUserId = userRes.data._id;
        } catch (err: any) {
          const errorMsg = err.response?.data?.message || 'Failed to create new user.';
          alert(`Error: ${errorMsg}`);
          setIsSubmitting(false);
          return;
        }
      }

      if (!finalUserId) {
        alert('Please select or create a customer.');
        setIsSubmitting(false);
        return;
      }

      const bookingData = {
        user: finalUserId,
        service: serviceId,
        worker: workerId || undefined,
        address,
        squareFootage, // Sent as generic units
        scheduledDate,
        scheduledTime,
        totalAmount,
      };
      await axios.post('/api/admin/bookings', bookingData);

      onBookingCreated();
      setIsOpen(false);
      // Reset form
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setIsNewUser(false);
    } catch (err) {
      console.error('Failed to create booking:', err);
      alert('Error: Could not create booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-100 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        Create Booking
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 my-8">
            <form onSubmit={handleSubmit}>
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Create New Booking</h3>
                <p className="text-sm text-gray-500 mt-1">Manually create a booking for a customer.</p>
              </div>

              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {fetchError ? (
                  <p className="text-red-500">{fetchError}</p>
                ) : users.length === 0 ? (
                  <p>Loading form data...</p>
                ) : (
                  <>
                    {/* User Selection Header */}
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-black">Customer Information</label>
                      <button
                        type="button"
                        onClick={() => setIsNewUser(!isNewUser)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        {isNewUser ? 'Select Existing Customer' : '+ Add New Customer'}
                      </button>
                    </div>

                    {!isNewUser ? (
                      /* Existing User Select */
                      <div>
                        <select id="user" value={userId} onChange={e => setUserId(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-black" required={!isNewUser}>
                          <option value="">Select a customer</option>
                          {users.map(user => (
                            <option key={user._id} value={user._id}>{user.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      /* New User Inputs */
                      <div className="space-y-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div>
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-black text-sm"
                            required={isNewUser}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="email"
                            placeholder="Email Address"
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-black text-sm"
                            required={isNewUser}
                          />
                          <input
                            type="tel"
                            placeholder="Phone Number"
                            value={newPhone}
                            onChange={e => setNewPhone(e.target.value)}
                            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-black text-sm"
                            required={isNewUser}
                          />
                        </div>
                        <p className="text-[10px] text-blue-600 italic">* New account will be created with default password: password123</p>
                      </div>
                    )}

                    {/* Service Select */}
                    <div>
                      <label htmlFor="service" className="block text-sm font-medium text-black">Service</label>
                      <select id="service" value={serviceId} onChange={e => setServiceId(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-black focus:ring-blue-500 focus:border-blue-500" required>
                        <option value="">Select a service</option>
                        {services.map(service => (
                          <option key={service._id} value={service._id}>{service.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Worker Select (Optional) */}
                    <div>
                      <label htmlFor="worker" className="block text-sm font-medium text-gray-700 text-black">Assign Worker (Optional)</label>
                      <select id="worker" value={workerId} onChange={e => setWorkerId(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-black focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Select a worker (optional)</option>
                        {workers.map(worker => (
                          <option key={worker._id} value={worker._id}>{worker.name}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">You can assign a worker now or later from the dashboard</p>
                    </div>

                    {/* Address */}
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium  text-black">Address</label>
                      <input type="text" id="address" value={address} onChange={e => setAddress(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-black" required />
                    </div>


                    {/* Unit/Quantity Selection */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        {currentUnitConfig?.label || 'Quantity / Size'}
                      </label>

                      {currentUnitConfig?.unitType === 'square' ? (
                        /* Square Footage Input */
                        <div className="space-y-3">
                          <input
                            type="number"
                            value={squareFootage}
                            onChange={(e) => setSquareFootage(Number(e.target.value) || 0)}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm text-black focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter area size"
                          />
                          <p className="text-xs text-gray-500">Enter the total area size in square feet.</p>
                        </div>
                      ) : (
                        /* Unit-based Quantity Selector */
                        <div className="space-y-4">
                          {/* Quick Select Buttons */}
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5, 10].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => {
                                  setSquareFootage(num);
                                  setSelectedUnitType('predefined');
                                }}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${squareFootage === num && selectedUnitType === 'predefined'
                                  ? 'bg-black text-white'
                                  : 'bg-white border border-gray-300 text-gray-700 hover:border-black'
                                  }`}
                              >
                                {num}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setSelectedUnitType('custom')}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedUnitType === 'custom'
                                ? 'bg-black text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:border-black'
                                }`}
                            >
                              Custom
                            </button>
                          </div>

                          {/* Custom input or manual override */}
                          {(selectedUnitType === 'custom' || !([1, 2, 3, 4, 5, 10].includes(squareFootage))) && (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                value={squareFootage}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setSquareFootage(val);
                                  if (![1, 2, 3, 4, 5, 10].includes(val)) {
                                    setSelectedUnitType('custom');
                                  }
                                }}
                                className="w-24 p-2 border border-gray-300 rounded-md shadow-sm text-black focus:ring-blue-500 focus:border-blue-500"
                                min="1"
                              />
                              <span className="text-sm text-gray-600">{currentUnitConfig?.label || 'Units'}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="date" className="block text-sm font-medium text-black">Date</label>
                        <input type="date" id="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-black" required />
                      </div>
                      <div>
                        <label htmlFor="time" className="block text-sm font-medium text-black">Time</label>
                        <input type="time" id="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-black" required />
                      </div>
                    </div>

                    {/* Total Amount */}
                    <div>
                      <label className="block text-sm font-medium text-black">Calculated Amount</label>
                      <p className="mt-1 text-lg font-semibold text-black">৳{totalAmount.toLocaleString()}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="p-4 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateBookingModal;
