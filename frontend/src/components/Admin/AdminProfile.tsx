import ChangePasswordModal from '../User/ChangePasswordModal';
import {useAuth} from '../../context/authState';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  UserCircleIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface AdminProfile {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  profilePicture?: string;
  role: string;
  lastLogin?: string;
  createdAt: string;
}

interface AdminSettings {
  emailNotifications: boolean;
  systemAlerts: boolean;
  userRegistrationAlerts: boolean;
  bookingAlerts: boolean;
  twoFactorEnabled: boolean;
  dashboardTheme: 'light' | 'dark';
  itemsPerPage: number;
  autoRefreshInterval: number;
}

export default function AdminProfile() {
  const { updateUserProfile } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>({
    emailNotifications: true,
    systemAlerts: true,
    userRegistrationAlerts: true,
    bookingAlerts: true,
    twoFactorEnabled: false,
    dashboardTheme: 'light',
    itemsPerPage: 10,
    autoRefreshInterval: 30
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    fetchProfile();
    axios.get('/api/admin/settings').then(r => setSettings(r.data)).catch(() => toast.error('Failed to load preferences'));
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/profile');
      setFormData({
        name: response.data.name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        address: response.data.address || '',
      });
    } catch (error) {
      toast.error('Failed to load profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };



  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put('/api/profile', formData);
      updateUserProfile(formData);
      toast.success('Profile updated successfully');
      fetchProfile();
    } catch (error: unknown) {
      toast.error((axios.isAxiosError<{message:string}>(error)?error.response?.data.message:undefined) || 'Failed to update profile');
    }
  };



  const handleExportData = async (type: 'users' | 'bookings' | 'all') => {
    try {
      const response = await axios.get(`/api/admin/export/${type}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${type} data exported successfully`);
    } catch {
      toast.error('Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Admin Profile</h1>
        <p className="text-gray-600 mt-2">Manage your admin account and system preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'profile', label: 'Profile', icon: UserCircleIcon },
            { id: 'security', label: 'Security', icon: ShieldCheckIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'profile'|'security')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Update Profile
              </button>
            </div>
          </form>
        </div>
      )}



      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <section className="bg-white rounded-2xl p-4">
            <h2 className="text-xl font-semibold mb-5">Workspace preferences</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <label className="text-sm text-slate-600">Items per page<select value={settings.itemsPerPage} onChange={e=>setSettings({...settings,itemsPerPage:Number(e.target.value)})} className="block mt-2 border p-3 w-full">{[10,25,50].map(n=><option key={n}>{n}</option>)}</select></label>
              <label className="text-sm text-slate-600">Refresh interval (seconds)<select value={settings.autoRefreshInterval} onChange={e=>setSettings({...settings,autoRefreshInterval:Number(e.target.value)})} className="block mt-2 border p-3 w-full">{[15,30,60].map(n=><option key={n}>{n}</option>)}</select></label>
            </div>
            <button disabled={savingSettings} onClick={async()=>{setSavingSettings(true);try{await axios.put('/api/admin/settings',{itemsPerPage:settings.itemsPerPage,autoRefreshInterval:settings.autoRefreshInterval});toast.success('Preferences saved');}catch{toast.error('Could not save preferences');}finally{setSavingSettings(false);}}} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-white">{savingSettings?'Saving…':'Save preferences'}</button>
          </section>
          {/* Change Password */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <KeyIcon className="h-6 w-6 mr-2" />
              Change Password
            </h2>
            <button onClick={() => setShowPassword(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
              Change Password
            </button>
          </div>

          {/* Data Export */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <ArrowDownTrayIcon className="h-6 w-6 mr-2" />
              Data Export
            </h2>
            <p className="text-sm text-gray-600 mb-4">Export system data for backup or analysis</p>
            <div className="flex space-x-3">
              <button
                onClick={() => handleExportData('users')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
              >
                Export Users
              </button>
              <button
                onClick={() => handleExportData('bookings')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
              >
                Export Bookings
              </button>
              <button
                onClick={() => handleExportData('all')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
              >
                Export All Data
              </button>
            </div>
          </div>
        </div>
      )}


      {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}
    </div>
  );
}