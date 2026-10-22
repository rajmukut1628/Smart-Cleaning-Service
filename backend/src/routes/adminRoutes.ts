import { getAnalytics } from '../controllers/analyticsController';
import { getPlatformActivity } from '../controllers/platformActivityController';
import { updateBookingPayment } from '../controllers/paymentController';
import { createManagedAccount } from '../controllers/managedAccountController';
import express from 'express';
import {
  getAllBookings,
  getAllUsers,
  getAllWorkers,
  assignWorkerToBooking,
  getAdminStats,
  createBookingByAdmin,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  bulkUpdateBookings,
  bulkCancelBookings,
  bulkDeleteUsers,
  bulkBlockUsers,
  getAdminSettings,
  updateAdminSettings,
  exportData,
  verifyWorker,
  updateUserRole,
  deleteUser,
} from '../controllers/adminController';
import { protect, admin, superAdmin } from '../middleware/authMiddleware';
import { getOwnership, transferOwnership, deleteAdministratorAccount } from '../controllers/ownershipController';

const router = express.Router();

// All routes in this file are protected and for admins only
router.use(protect, admin);
router.get('/ownership', getOwnership);
router.post('/ownership/transfer', superAdmin, transferOwnership);

router.put('/bookings/:id/payment', updateBookingPayment);

router.route('/stats').get(getAdminStats);
router.get('/analytics',getAnalytics);
router.route('/bookings').get(getAllBookings).post(createBookingByAdmin);
router.route('/users').get(getAllUsers).post(createManagedAccount);
router.route('/workers').get(getAllWorkers);
router.route('/users/:id/role').put(superAdmin, updateUserRole);
router.route('/users/:id').delete(deleteUser);
router.route('/bookings/:id/assign').put(assignWorkerToBooking);

// Admin management routes
router.route('/admins').get(getAllAdmins).post(superAdmin, createAdmin);
router.delete('/admins/:id/account', superAdmin, deleteAdministratorAccount);
router.route('/admins/:id').put(superAdmin, updateAdmin).delete(superAdmin, deleteAdmin);

// Bulk operations routes
router.route('/bookings/bulk-update').put(bulkUpdateBookings);
router.route('/bookings/bulk-cancel').put(bulkCancelBookings);
router.route('/users/bulk-delete').delete(bulkDeleteUsers);
router.route('/users/bulk-block').put(bulkBlockUsers);

// Admin profile routes
router.route('/settings').get(getAdminSettings).put(updateAdminSettings);
router.route('/activity-logs').get(getPlatformActivity);
router.route('/export/:type').get(exportData);

// Worker verification route
router.route('/workers/:id/verify').put(verifyWorker);

export default router;
