import { createHash } from 'crypto';
import { Request, Response } from 'express';
import Booking from '../models/Booking';
import NotificationRead from '../models/NotificationRead';
interface CustomerRequest extends Request { user?: { _id: unknown; role: string } }
const key = (...parts: unknown[]) => createHash('sha256').update(JSON.stringify(parts)).digest('hex');
export function buildCustomerNotifications(bookings: any[]) {
  const items: { id: string; type: string; title: string; message: string; createdAt: string; href: string; read: boolean }[] = [];
  const titles: Record<string, string> = { pending: 'Booking received', confirmed: 'Your booking is confirmed', 'in-progress': 'Your cleaning is in progress', completed: 'Your cleaning is complete', cancelled: 'Your booking was cancelled' };
  for (const booking of bookings) {
    const id = String(booking._id); const service = booking.service?.name || 'Cleaning service';
    const day = new Date(booking.scheduledDate).toISOString().slice(0, 10);
    const createdAt = new Date(booking.updatedAt || booking.createdAt).toISOString();
    items.push({ id: key('customer-booking', id, booking.status, day, booking.scheduledTime, booking.address, String(booking.worker || ''), (booking.workers || []).map(String).sort()), type: 'booking', title: titles[booking.status] || 'Booking updated', message: `${service} · ${day} at ${booking.scheduledTime}. Open your booking to see its current details.`, createdAt, href: `/user-dashboard?booking=${id}`, read: false });
    if (booking.paymentStatus === 'paid') items.push({ id: key('customer-payment', id, booking.paymentConfirmedAt || 'confirmed'), type: 'payment', title: 'Your cash payment is confirmed', message: `The cash payment for ${service} has been confirmed. View your booking for payment details.`, createdAt: new Date(booking.paymentConfirmedAt || createdAt).toISOString(), href: `/user-dashboard?booking=${id}`, read: false });
    if (booking.status === 'completed' && !booking.isReviewed && booking.worker) items.push({ id: key('customer-review-invitation', id), type: 'review', title: 'How was your cleaning?', message: `Your ${service} is complete. Share your experience with a customer review.`, createdAt: new Date(booking.completedAt || createdAt).toISOString(), href: `/user-dashboard?review=${id}`, read: false });
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}
async function inbox(customerId: unknown) {
  const bookings = await Booking.find({ user: customerId }).select('_id service status scheduledDate scheduledTime address worker workers paymentStatus paymentConfirmedAt isReviewed completedAt createdAt updatedAt').populate('service', 'name').sort({ updatedAt: -1 }).limit(50).lean();
  return buildCustomerNotifications(bookings);
}
export async function getCustomerNotifications(req: CustomerRequest, res: Response) {
  try {
    const items = await inbox(req.user!._id);
    const receipts = await NotificationRead.find({ recipient: req.user!._id, notificationId: { $in: items.map(item => item.id) } }).select('notificationId').lean();
    const read = new Set(receipts.map(row => row.notificationId)); const notifications = items.map(item => ({ ...item, read: read.has(item.id) }));
    res.json({ notifications, unreadCount: notifications.filter(item => !item.read).length });
  } catch { res.status(500).json({ message: 'Unable to load your notifications. Please try again.' }); }
}
export async function readCustomerNotifications(req: CustomerRequest, res: Response) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length > 150 || ids.some(id => typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id))) return res.status(400).json({ message: 'Provide up to 150 valid notification IDs' });
  try {
    const own = new Set((await inbox(req.user!._id)).map(item => item.id));
    if (ids.some(id => !own.has(id))) return res.status(404).json({ message: 'Notification no longer available in your inbox' });
    if (ids.length) await NotificationRead.bulkWrite([...new Set<string>(ids)].map(notificationId => ({ updateOne: { filter: { recipient: req.user!._id, notificationId }, update: { $setOnInsert: { readAt: new Date() } }, upsert: true } })));
    res.json({ message: 'Notifications marked as read', ids });
  } catch { res.status(500).json({ message: 'Unable to update notifications. Please try again.' }); }
}

