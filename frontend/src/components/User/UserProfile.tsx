import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/apiConfig';
import {
  UserCircleIcon,
  CameraIcon,
  UserIcon,
  ClockIcon,
  ChartBarIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import ChangePasswordModal from './ChangePasswordModal';

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  profilePicture?: string;
  role: string;
  familySize?: number;
  hasPets?: boolean;
  petDetails?: string;
  specialNeeds?: string;
  emergencyContacts?: EmergencyContact[];
  preferredTimeSlots?: string[];
}

interface Booking {
  _id: string;
  service: { name: string };
  status: string;
  totalAmount: number;
  scheduledDate: string;
  createdAt: string;
}

interface SpendingData {
  totalSpent: number;
  monthlySpending: { [key: string]: number };
  totalBookings: number;
}

export default function UserProfile() {
  const { updateUserProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [spendingData, setSpendingData] = useState<SpendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'bookings' | 'analytics'>('profile');
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    familySize: 1,
    hasPets: false,
    petDetails: '',
    specialNeeds: '',
    emergencyContacts: [] as EmergencyContact[],
    preferredTimeSlots: [] as string[],
  });

  useEffect(() => {
    fetchProfile();
    if (activeTab === 'bookings') fetchBookings();
    if (activeTab === 'analytics') fetchSpendingData();
  }, [activeTab]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/profile');
      console.log('Profile data:', response.data);
      console.log('Profile picture:', response.data.profilePicture);
      console.log('API_BASE_URL:', API_BASE_URL);
      console.log('Full image URL will be:', `${API_BASE_URL}${response.data.profilePicture}`);
      
      setProfile(response.data);
      setFormData({
        name: response.data.name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        address: response.data.address || '',
        familySize: response.data.familySize || 1,
        hasPets: response.data.hasPets || false,
        petDetails: response.data.petDetails || '',
        specialNeeds: response.data.specialNeeds || '',
        emergencyContacts: response.data.emergencyContacts || [],
        preferredTimeSlots: response.data.preferredTimeSlots || [],
      });
    } catch (error) {
      toast.error('Failed to load profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await axios.get('/api/bookings/user');
      setBookings(response.data);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  const fetchSpendingData = async () => {
    try {
      const response = await axios.get('/api/profile/spending-analytics');
      setSpendingData(response.data);
    } catch (error) {
      console.error('Failed to load spending data:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleTimeSlotChange = (slot: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      preferredTimeSlots: checked
        ? [...prev.preferredTimeSlots, slot]
        : prev.preferredTimeSlots.filter(s => s !== slot)
    }));
  };

  const handleEmergencyContactChange = (index: number, field: keyof EmergencyContact, value: string) => {
    const updatedContacts = [...formData.emergencyContacts];
    updatedContacts[index] = { ...updatedContacts[index], [field]: value };
    setFormData((prev) => ({ ...prev, emergencyContacts: updatedContacts }));
  };

  const addEmergencyContact = () => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, { name: '', phone: '', relationship: '' }]
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.put('/api/profile', formData);
      setProfile(response.data.user);
      updateUserProfile({
        name: response.data.user.name,
        email: response.data.user.email,
        phone: response.data.user.phone,
        address: response.data.user.address,
      });
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('profilePicture', file);

    setUploading(true);
    try {
      console.log('Uploading profile picture:', file.name, file.type);
      
      const response = await axios.put('/api/profile/picture', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      console.log('Upload response:', response.data);
      console.log('Profile picture path:', response.data.user.profilePicture);
      console.log('Full URL:', `${API_BASE_URL}${response.data.user.profilePicture}`);
      
      setProfile(response.data.user);
      updateUserProfile({
        avatar: `${API_BASE_URL}${response.data.user.profilePicture}`,
      });
      // Reload profile to get updated image
      fetchProfile();
      toast.success('Profile picture updated successfully!');
    } catch (error: any) {
      console.error('Profile picture upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const repeatBooking = async (bookingId: string) => {
    try {
      await axios.post(`/api/bookings/${bookingId}/repeat`);
      toast.success('Booking repeated successfully!');
      fetchBookings();
    } catch (error) {
      toast.error('Failed to repeat booking');
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'bookings', name: 'Booking History', icon: ClockIcon },
    { id: 'analytics', name: 'Spending Analytics', icon: ChartBarIcon },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white">
        <h1 className="text-2xl font-bold mb-2">My Profile</h1>
        <p className="text-blue-100">Manage your personal information and preferences</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Profile Picture Section */}
              <div className="flex items-center space-x-6 p-4 bg-gray-50 rounded-lg">
                <div className="relative">
                  {profile?.profilePicture ? (
                    <>
                      <img
                        src={`${API_BASE_URL}${profile.profilePicture}`}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
                        onError={(e) => {
                          console.error('Image load error:', profile.profilePicture);
                          console.error('Attempted URL:', `${API_BASE_URL}${profile.profilePicture}`);
                          console.error('Status:', e);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('✅ Image loaded successfully!');
                        }}
                      />
                      {/* Debug info - remove after fixing */}
                      <div className="absolute top-0 left-0 bg-black bg-opacity-75 text-white text-xs p-1 rounded hidden">
                        {profile.profilePicture}
                      </div>
                    </>
                  ) : (
                    <UserCircleIcon className="w-24 h-24 text-gray-400" />
                  )}
                  <label
                    htmlFor="profile-picture-upload"
                    className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors"
                  >
                    {uploading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <CameraIcon className="w-5 h-5 text-white" />
                    )}
                    <input
                      id="profile-picture-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{profile?.name}</h3>
                  <p className="text-gray-600">{profile?.email}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    {profile?.role}
                  </span>
                </div>
                <div className="ml-auto flex space-x-3">
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setEditing(false);
                          fetchProfile();
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Change Password
                  </button>
                </div>
              </div>

              {!editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <p className="text-gray-900">{profile?.name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-gray-900">{profile?.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-gray-900">{profile?.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <p className="text-gray-900">{profile?.address || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Family Size</label>
                    <p className="text-gray-900">{profile?.familySize || 1} members</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pets</label>
                    <p className="text-gray-900">{profile?.hasPets ? `Yes${profile.petDetails ? ` - ${profile.petDetails}` : ''}` : 'No'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Special Needs</label>
                    <p className="text-gray-900">{profile?.specialNeeds || 'None specified'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time Slots</label>
                    <div className="flex flex-wrap gap-2">
                      {profile?.preferredTimeSlots?.map(slot => (
                        <span key={slot} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full capitalize">
                          {slot}
                        </span>
                      )) || <span className="text-gray-500">None specified</span>}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contacts</label>
                    <div className="space-y-2">
                      {profile?.emergencyContacts?.map((contact, index) => (
                        <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{contact.name}</p>
                            <p className="text-sm text-gray-600">{contact.relationship} • {contact.phone}</p>
                          </div>
                        </div>
                      )) || <p className="text-gray-500">No emergency contacts added</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Family Size</label>
                      <input
                        type="number"
                        name="familySize"
                        min="1"
                        value={formData.familySize}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Has Pets</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="hasPets"
                          checked={formData.hasPets}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Yes, I have pets</span>
                      </div>
                    </div>
                    {formData.hasPets && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pet Details</label>
                        <input
                          type="text"
                          name="petDetails"
                          value={formData.petDetails}
                          onChange={handleInputChange}
                          placeholder="e.g., 2 dogs, 1 cat"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Special Needs</label>
                      <textarea
                        name="specialNeeds"
                        value={formData.specialNeeds}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Any special requirements or accessibility needs..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time Slots</label>
                      <div className="space-y-2">
                        {['morning', 'afternoon', 'evening'].map(slot => (
                          <label key={slot} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.preferredTimeSlots.includes(slot)}
                              onChange={(e) => handleTimeSlotChange(slot, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700 capitalize">{slot} (6AM-12PM / 12PM-6PM / 6PM-12AM)</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contacts</label>
                      <div className="space-y-3">
                        {formData.emergencyContacts.map((contact, index) => (
                          <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 grid grid-cols-3 gap-3">
                              <input
                                type="text"
                                placeholder="Name"
                                value={contact.name}
                                onChange={(e) => handleEmergencyContactChange(index, 'name', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                              <input
                                type="tel"
                                placeholder="Phone"
                                value={contact.phone}
                                onChange={(e) => handleEmergencyContactChange(index, 'phone', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                              <input
                                type="text"
                                placeholder="Relationship"
                                value={contact.relationship}
                                onChange={(e) => handleEmergencyContactChange(index, 'relationship', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeEmergencyContact(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addEmergencyContact}
                          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          <PlusIcon className="h-4 w-4" />
                          <span>Add Emergency Contact</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Booking History Tab */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Booking History</h3>
              {bookings.length === 0 ? (
                <p className="text-center py-4 text-gray-500">No bookings found</p>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 rounded-lg p-3">
                          <ClockIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{booking.service?.name || 'Service'}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(booking.scheduledDate).toLocaleDateString()} • ${booking.totalAmount}
                          </p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                      {booking.status === 'completed' && (
                        <button
                          onClick={() => repeatBooking(booking._id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Repeat Booking
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Spending Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Spending Analytics</h3>

              {!spendingData ? (
                <p className="text-center py-4 text-gray-500">Loading spending data...</p>
              ) : spendingData.totalBookings === 0 ? (
                <p className="text-center py-4 text-gray-500">No completed bookings found for analytics</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center">
                        <ChartBarIcon className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Spent</p>
                          <p className="text-2xl font-bold text-gray-900">${spendingData.totalSpent}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center">
                        <ClockIcon className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                          <p className="text-2xl font-bold text-gray-900">{spendingData.totalBookings}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center">
                        <ChartBarIcon className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Average per Booking</p>
                          <p className="text-2xl font-bold text-gray-900">
                            ${spendingData.totalBookings > 0 ? (spendingData.totalSpent / spendingData.totalBookings).toFixed(2) : '0.00'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Monthly Spending</h4>
                    <div className="space-y-2">
                      {Object.entries(spendingData.monthlySpending)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([month, amount]) => (
                          <div key={month} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                            <span className="text-sm text-gray-600">{month}</span>
                            <span className="text-sm font-medium text-gray-900">${amount}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}
