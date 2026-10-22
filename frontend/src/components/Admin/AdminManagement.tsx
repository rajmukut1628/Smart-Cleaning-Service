import OwnershipAccess, { OwnershipAction } from './OwnershipAccess';
import { notifyManagementUpdated } from './managementEvents';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User } from '../../types';
import { XMarkIcon, PencilIcon, TrashIcon, PlusIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface AdminFormData {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  role: string;
}

export default function AdminManagement() {
  const [deletion, setDeletion] = useState<User | null>(null);
  const [removal, setRemoval] = useState<User | null>(null);
  const [admins, setAdmins] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [formData, setFormData] = useState<AdminFormData>({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    role: 'admin',
  });

  useEffect(() => {
    fetchAdmins();
    fetchCurrentProfile();
  }, []);

  const fetchCurrentProfile = async () => {
    try {
      const response = await axios.get('/api/profile');
      setCurrentUserRole(response.data.role);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await axios.get('/api/admin/admins');
      const adminsData = response.data.map((admin: any) => ({
        ...admin,
        id: admin._id,
      }));
      setAdmins(adminsData);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Failed to load admins');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setEditingAdmin(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      role: 'admin',
    });
    setShowModal(true);
  };

  const openEditModal = (admin: User) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      password: '', // Don't prefill password
      phone: admin.phone || '',
      address: admin.address || '',
      role: admin.role,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAdmin) {
        await axios.put(`/api/admin/admins/${editingAdmin.id}`, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
        });

        toast.success('Admin updated successfully');
      } else {
        await axios.post('/api/admin/admins', formData);
        toast.success('Admin created successfully');
      }
      setShowModal(false);
      notifyManagementUpdated();
      fetchAdmins();
    } catch (error: any) {
      console.error('Error saving admin:', error);
      toast.error(error.response?.data?.message || 'Failed to save admin');
    }
  };

  const handleDelete = (adminId: string) => { const target = admins.find(person => person.id === adminId); if (target && target.role !== 'superadmin') setRemoval(target); };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-3">
      <OwnershipAccess />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Administrator directory</h1>
        <button
          disabled={currentUserRole !== 'superadmin'}
          title={currentUserRole !== 'superadmin' ? 'Superadmin permission required' : 'Create administrator'}
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Admin
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.map((admin) => (
              <tr key={admin.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{admin.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{admin.phone || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{admin.address || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${admin.role === 'superadmin' ? 'bg-blue-100 text-blue-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                    {admin.role === 'superadmin' ? 'Platform Owner' : 'Administrator'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    disabled={currentUserRole !== 'superadmin'} onClick={() => openEditModal(admin)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    disabled={currentUserRole !== 'superadmin' || admin.role === 'superadmin'} title="Remove admin access" aria-label={'Remove administrator access for ' + admin.name} onClick={() => handleDelete(admin.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <ShieldExclamationIcon className="h-5 w-5" />
                  </button>
                  <button type="button" title="Delete administrator account" aria-label={'Delete administrator ' + admin.name} disabled={currentUserRole !== 'superadmin' || admin.role === 'superadmin'} onClick={() => setDeletion(admin)} className="text-red-600 hover:text-red-900 disabled:opacity-30"><TrashIcon className="h-5 w-5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deletion && <OwnershipAction mode="delete" target={{ _id: deletion.id, name: deletion.name, email: deletion.email }} onClose={() => setDeletion(null)} onDone={() => { setDeletion(null); void fetchAdmins(); toast.success('Administrator account deleted'); }} />}
      {removal && <OwnershipAction mode="remove" target={{ _id: removal.id, name: removal.name, email: removal.email }} onClose={() => setRemoval(null)} onDone={() => { setRemoval(null); fetchAdmins(); notifyManagementUpdated(); toast.success('Administrator access removed'); }} />}
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingAdmin ? 'Edit Admin' : 'Create New Admin'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {!editingAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    name="password"
                    minLength={12}
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="text"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm transition-colors"
                >
                  {editingAdmin ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
