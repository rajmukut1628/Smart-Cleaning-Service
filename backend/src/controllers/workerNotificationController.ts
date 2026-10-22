import { createHash } from 'crypto';
import { Request, Response } from 'express';
import Booking from '../models/Booking';
import Review from '../models/Review';
import NotificationRead from '../models/NotificationRead';

interface WorkerRequest extends Request { user?: { _id: unknown } }
interface Item { id: string; type: string; title: string; message: string; createdAt: string; href: string; bookingId?: string; read: boolean }
const identifier = (...parts: unknown[]) => createHash('sha256').update(JSON.stringify(parts)).digest('hex');

// This is an inbox of current, authorized work updates, not the platform activity log.
// Semantic keys keep photo uploads, profile edits and mark-read requests from creating false unread alerts.
export function buildWorkerNotifications(bookings: any[], reviews: any[]): Item[] {
  const items: Item[] = [];
  for (const job of bookings) {
    const bookingId = String(job._id);
    const day = new Date(job.scheduledDate).toISOString().slice(0, 10);
    const service = job.service?.name || 'Cleaning service';
    const titles: Record<string, string> = { pending: 'Assignment awaiting confirmation', confirmed: 'Job assigned to you', 'in-progress': 'Job in progress', completed: 'Job completed', cancelled: 'Job cancelled' };
    items.push({ id: identifier('job', bookingId, job.status, day, job.scheduledTime, job.address, (job.workers || []).map(String).sort()), type: 'job', title: titles[job.status] || 'Assignment updated', message: `${service} · ${day} at ${job.scheduledTime}. ${job.address || 'Open the assignment for details.'}`, createdAt: new Date(job.updatedAt || job.createdAt).toISOString(), href: `/jobs?booking=${bookingId}`, bookingId, read: false });
    if(job.reschedule?.status==='approved')items.push({id:identifier('rescheduled',bookingId,job.reschedule.id),type:'job',title:'Job schedule changed',message:service+' · '+day+' at '+job.scheduledTime,createdAt:new Date(job.reschedule.decidedAt).toISOString(),href:'/jobs?booking='+bookingId,bookingId,read:false});
    if (job.status === 'completed' && job.paymentStatus === 'paid') items.push({ id: identifier('cash', bookingId, job.paymentConfirmedAt || 'confirmed'), type: 'payment', title: 'Customer cash payment confirmed', message: `Cash payment for ${service} has been confirmed. See your allocated job value in Earnings; this is not a worker payout confirmation.`, createdAt: new Date(job.paymentConfirmedAt || job.updatedAt).toISOString(), href: '/jobs?booking='+bookingId, bookingId, read: false });
  }
  for (const review of reviews) items.push({ id: identifier('review', String(review._id), review.rating), type: 'review', title: 'New customer review', message: `A customer rated your ${review.service?.name || 'cleaning service'} ${review.rating}/5. View the feedback on your dashboard.`, createdAt: new Date(review.createdAt).toISOString(), href: '/worker-dashboard#worker-feedback', read: false });
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}

async function currentInbox(workerId: unknown) {
  const jobs = await Booking.find({ $or: [{ worker: workerId }, { workers: workerId }] })
    .select('_id service status scheduledDate scheduledTime address workers paymentStatus paymentConfirmedAt createdAt updatedAt reschedule')
    .populate('service', 'name').sort({ updatedAt: -1 }).limit(50).lean();
  // Reviews on a team assignment belong to every worker currently assigned to that booking.
  const reviewJobs = jobs.map(job => job._id);
  const reviews = await Review.find({ $or: [{ worker: workerId }, { booking: { $in: reviewJobs } }] })
    .select('_id rating service createdAt').populate('service', 'name').sort({ createdAt: -1 }).limit(20).lean();
  return buildWorkerNotifications(jobs, reviews);
}

export async function getWorkerNotifications(req: WorkerRequest, res: Response) {
  try {
    const items = await currentInbox(req.user!._id);
    const receipts = await NotificationRead.find({ recipient: req.user!._id, notificationId: { $in: items.map(item => item.id) } }).select('notificationId').lean();
    const read = new Set(receipts.map(row => row.notificationId));
    const notifications = items.map(item => ({ ...item, read: read.has(item.id) }));
    res.json({ notifications, unreadCount: notifications.filter(item => !item.read).length });
  } catch { res.status(500).json({ message: 'Unable to load your notifications. Please try again.' }); }
}

export async function readWorkerNotifications(req: WorkerRequest, res: Response) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length > 120 || ids.some(id => typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id))) return res.status(400).json({ message: 'Provide up to 120 valid notification IDs' });
  try {
    const ownIds = new Set((await currentInbox(req.user!._id)).map(item => item.id));
    if (ids.some(id => !ownIds.has(id))) return res.status(404).json({ message: 'Notification no longer available in your inbox' });
    if (ids.length) await NotificationRead.bulkWrite([...new Set<string>(ids)].map(notificationId => ({ updateOne: { filter: { recipient: req.user!._id, notificationId }, update: { $setOnInsert: { readAt: new Date() } }, upsert: true } })));
    res.json({ message: 'Notifications marked as read', ids });
  } catch { res.status(500).json({ message: 'Unable to update notifications. Please try again.' }); }
}

export async function getWorkerFeedback(req: WorkerRequest, res: Response) {
  try {
    const jobs = await Booking.find({ $or: [{ worker: req.user!._id }, { workers: req.user!._id }] }).select('_id').lean();
    const reviews = await Review.find({ $or: [{ worker: req.user!._id }, { booking: { $in: jobs.map(job => job._id) } }] })
      .select('_id rating comment user service createdAt').populate('user', 'name').populate('service', 'name').sort({ createdAt: -1 }).limit(50).lean();
    res.json({ reviews, averageRating: reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0 });
  } catch { res.status(500).json({ message: 'Unable to load your customer feedback' }); }
}
