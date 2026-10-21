import { useState, useEffect } from 'react';
import axios from 'axios';
import { Booking, User } from '../../types';
import toast from 'react-hot-toast';

export default function BulkOperations() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'bookings' | 'users'>('bookings');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchBookings();
    } else {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchBookings = async () => {
    try {
      const response = await axios.get('/api/admin/bookings');
      const mappedBookings = response.data.map((b: any) => ({
        ...b,
        id: b._id,
        customerName: b.user?.name || 'Unknown',
        customerEmail: b.user?.email || '',
        customerPhone: b.user?.phone || '',
        serviceName: b.service?.name || 'Unknown Service',
      }));
      setBookings(mappedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      const mappedUsers = response.data.map((u: any) => ({
        ...u,
        id: u._id,
      }));
      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const handleBookingSelect = (bookingId: string, checked: boolean) => {
    if (checked) {
      setSelectedBookings(prev => [...prev, bookingId]);
    } else {
      setSelectedBookings(prev => prev.filter(id => id !== bookingId));
    }
  };

  const handleUserSelect = (userId: string, checked: boolean) => {
    const user = users.find(u => u.id === userId);
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      toast.error('Cannot select admin or super admin users for bulk operations');
      return;
    }

    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAllBookings = (checked: boolean) => {
    if (checked) {
      setSelectedBookings(bookings.map(b => b.id));
    } else {
      setSelectedBookings([]);
    }
  };

  const handleSelectAllUsers = (checked: boolean) => {
    if (checked) {
      // Only select non-admin and non-superadmin users
      setSelectedUsers(users.filter(u => u.role !== 'admin' && u.role !== 'superadmin').map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const bulkUpdateBookings = async (status: string) => {
    if (selectedBookings.length === 0) {
      toast.error('Please select bookings first');
      return;
    }

    setIsLoading(true);
    try {
      await axios.put('/api/admin/bookings/bulk-update', {
        bookingIds: selectedBookings,
        status,
      });
      toast.success(`Updated ${selectedBookings.length} bookings to ${status}`);
      setSelectedBookings([]);
      fetchBookings();
    } catch (error: any) {
      console.error('Error updating bookings:', error);
      toast.error(error.response?.data?.message || 'Failed to update bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const bulkCancelBookings = async () => {
    if (selectedBookings.length === 0) {
      toast.error('Please select bookings first');
      return;
    }

    setIsLoading(true);
    try {
      await axios.put('/api/admin/bookings/bulk-cancel', {
        bookingIds: selectedBookings,
      });
      toast.success(`Cancelled ${selectedBookings.length} bookings`);
      setSelectedBookings([]);
      fetchBookings();
    } catch (error: any) {
      console.error('Error cancelling bookings:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const bulkDeleteUsers = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users first');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) return;

    setIsLoading(true);
    try {
      const response = await axios.delete('/api/admin/users/bulk-delete', {
        data: { userIds: selectedUsers },
      });
      toast.success(response.data.message);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting users:', error);
      toast.error(error.response?.data?.message || 'Failed to delete users');
    } finally {
      setIsLoading(false);
    }
  };

  const bulkBlockUsers = async (block: boolean) => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.put('/api/admin/users/bulk-block', {
        userIds: selectedUsers,
        block,
      });
      toast.success(response.data.message);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error: any) {
      console.error('Error blocking users:', error);
      toast.error(error.response?.data?.message || 'Failed to block users');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatus = (status: string) => {
    const statusClasses: Record<string, string> = {
      completed: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      pending: 'bg-red-100 text-red-800',
      confirmed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Bulk Operations</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'bookings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Users ({users.length})
          </button>
        </nav>
      </div>

      {/* Bulk Actions */}
      {activeTab === 'bookings' && selectedBookings.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-3">
            Selected {selectedBookings.length} booking(s)
          </h3>
          <div className="flex space-x-3">
            <button
              onClick={() => bulkUpdateBookings('confirmed')}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Confirm Selected
            </button>
            <button
              onClick={() => bulkUpdateBookings('in-progress')}
              disabled={isLoading}
              className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              Mark In Progress
            </button>
            <button
              onClick={() => bulkUpdateBookings('completed')}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Mark Completed
            </button>
            <button
              onClick={bulkCancelBookings}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Cancel Selected
            </button>
          </div>
        </div>
      )}

      {activeTab === 'users' && selectedUsers.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-3">
            Selected {selectedUsers.length} user(s) for bulk operations
          </h3>
          <div className="flex space-x-3">
            <button
              onClick={() => bulkBlockUsers(true)}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Block Selected
            </button>
            <button
              onClick={() => bulkBlockUsers(false)}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Unblock Selected
            </button>
            <button
              onClick={bulkDeleteUsers}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Bookings Table */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedBookings.length === bookings.length && bookings.length > 0}
                    onChange={(e) => handleSelectAllBookings(e.target.checked)}
                    className="rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedBookings.includes(booking.id)}
                      onChange={(e) => handleBookingSelect(booking.id, e.target.checked)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {booking.customerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.serviceName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderStatus(booking.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    ৳{booking.totalAmount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users Table */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.filter(u => u.role !== 'admin' && u.role !== 'superadmin').length && users.filter(u => u.role !== 'admin' && u.role !== 'superadmin').length > 0}
                    onChange={(e) => handleSelectAllUsers(e.target.checked)}
                    className="rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className={`hover:bg-gray-50 ${user.role === 'admin' || user.role === 'superadmin' ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => handleUserSelect(user.id, e.target.checked)}
                      disabled={user.role === 'admin' || user.role === 'superadmin'}
                      className="rounded disabled:opacity-50"
                      title={user.role === 'admin' || user.role === 'superadmin' ? 'Admin or Super Admin users cannot be selected for bulk operations' : ''}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 text-xs rounded-full ${(user.role === 'admin' || user.role === 'superadmin')
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                      }`}>
                      {user.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}