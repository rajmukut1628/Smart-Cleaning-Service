import BusinessAnalytics from '../Admin/BusinessAnalytics';
import WorkerJobs from '../Worker/WorkerJobs';
import WorkerEarnings from '../Worker/WorkerEarnings';
import { Link } from 'react-router-dom';
import WorkerManagement from '../Admin/WorkerManagement';
import ServiceManagement from '../Admin/ServiceManagement';
import BookingCalendar from '../Admin/BookingCalendar';


export function ManagementPage({ type }: { type: 'workers' | 'services' | 'bookings' }) {
  if (type === 'services') return <ServiceManagement />;
  return <div className="space-y-4"><div><p className="text-sm font-semibold text-blue-600">Workspace</p><h1 className="mt-2 text-3xl font-bold">{type === 'workers' ? 'Worker management' : 'Booking schedule'}</h1></div>{type === 'workers' ? <WorkerManagement /> : <BookingCalendar />}</div>;
}
export function AnalyticsPage() { return <BusinessAnalytics />; }
export function WorkerJobsPage() { return <WorkerJobs />; }
export function PerformancePage() { return <WorkerEarnings />; }
export function NotFoundPage() { return <div className="text-center py-24"><p className="text-blue-600 font-bold">404</p><h1 className="text-3xl font-bold mt-4">Page not found</h1><Link className="inline-block rounded-xl bg-blue-600 text-white px-6 py-3 mt-4" to="/">Back to home</Link></div>; }

