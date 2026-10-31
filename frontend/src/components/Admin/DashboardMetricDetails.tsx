import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowUpRight, Briefcase, CalendarDays, ChevronLeft, ChevronRight, Loader2, Mail, Phone, RefreshCw, Search, Users, Wallet, X } from 'lucide-react';
import type { BookingRecord } from '../../types/booking';
import BookingDetailsModal from './BookingDetailsModal';

export type DashboardMetric = 'revenue' | 'bookings' | 'customers' | 'workforce';
interface Account { _id: string; name: string; email?: string; phone?: string; role: string }
const settings = {
  revenue: { title: 'Confirmed revenue', description: 'Completed work with confirmed cash. Reversed payments are excluded.', icon: Wallet },
  bookings: { title: 'All bookings', description: 'Explore schedules, teams and payment progress in one place.', icon: CalendarDays },
  customers: { title: 'Customer directory', description: 'Customer contact details and their recorded booking activity.', icon: Users },
  workforce: { title: 'Your workforce', description: 'Worker contact details and assigned job activity.', icon: Briefcase },
};
const money = (value: number) => '৳' + value.toLocaleString('en-BD', { maximumFractionDigits: 2 });
const date = (value?: string) => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' }) : 'Not recorded';
const statusName = (value: string) => ({ pending: 'Pending', confirmed: 'Confirmed', 'in-progress': 'In progress', completed: 'Work completed', cancelled: 'Cancelled' }[value] || value);
const teamIds = (booking: BookingRecord) => new Set([booking.worker?._id, ...(booking.workers || []).map(worker => worker?._id)].filter(Boolean));
const pageSize = 8;

export default function DashboardMetricDetails({ kind, onClose, onUpdated }: { kind: DashboardMetric; onClose: () => void; onUpdated: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<BookingRecord | null>(null);
  const meta = settings[kind];
  const isDirectory = kind === 'customers' || kind === 'workforce';
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const [jobs, people] = await Promise.all([
        axios.get<BookingRecord[]>('/api/admin/bookings', { signal }),
        kind === 'customers' ? axios.get<Account[]>('/api/admin/users', { params: { role: 'user' }, signal })
          : kind === 'workforce' ? axios.get<Account[]>('/api/admin/workers', { signal }) : Promise.resolve(null),
      ]);
      if (signal?.aborted) return;
      setBookings(jobs.data);
      setAccounts((people?.data || []).filter(account => account.role === (kind === 'customers' ? 'user' : 'worker')));
    } catch (err) { if (!axios.isCancel(err) && !signal?.aborted) setError('Details could not be loaded. Please try again.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [kind]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  useEffect(() => {
    const node = dialog.current, previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; node?.showModal(); searchInput.current?.focus();
    return () => { node?.close(); document.body.style.overflow = overflow; if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  const eligible = kind === 'revenue' ? bookings.filter(booking => booking.status === 'completed' && booking.paymentStatus === 'paid') : bookings;
  const query = search.trim().toLowerCase();
  const filteredBookings = eligible.filter(booking => (status === 'all' || booking.status === status) && [booking._id, booking.user?.name, booking.user?.email, booking.serviceSnapshot?.name, booking.service?.name].some(value => value?.toLowerCase().includes(query)));
  const filteredAccounts = accounts.filter(account => [account.name, account.email, account.phone].some(value => value?.toLowerCase().includes(query)));
  const count = isDirectory ? filteredAccounts.length : filteredBookings.length;
  const pages = Math.max(1, Math.ceil(count / pageSize)), currentPage = Math.min(page, pages);
  const offset = (currentPage - 1) * pageSize;
  const totalRevenue = eligible.reduce((total, booking) => total + Number(booking.totalAmount || 0), 0);
  const memberJobs = (account: Account) => bookings.filter(booking => kind === 'customers' ? booking.user?._id === account._id : teamIds(booking).has(account._id));
  const Icon = meta.icon;

  return <><dialog ref={dialog} className="metric-details-dialog" aria-labelledby="metric-details-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="metric-details-header"><div><span className="metric-details-eyebrow">OPERATIONS / DETAILS</span><h2 id="metric-details-title"><Icon size={22}/>{meta.title}</h2><p>{meta.description}</p></div><button type="button" className="metric-close" aria-label="Close details" onClick={onClose}><X size={19}/></button></header>
    <div className="metric-details-summary"><div><span>{kind === 'revenue' ? 'Confirmed collections' : isDirectory ? 'Registered accounts' : 'Booking records'}</span><strong>{loading || error ? '—' : kind === 'revenue' ? money(totalRevenue) : isDirectory ? accounts.length : bookings.length}</strong></div><p>{kind === 'revenue' ? eligible.length + ' paid & completed bookings' : kind === 'customers' ? 'Customer accounts only' : kind === 'workforce' ? 'Workers only · job counts include team assignments' : 'Work status and cash confirmation are tracked separately'}</p><button type="button" disabled={loading} onClick={() => void load()} aria-label="Refresh details"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/></button></div>
    <div className="metric-details-filters"><label><Search size={16}/><input ref={searchInput} aria-label="Search details" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder={isDirectory ? 'Search name, email or phone…' : 'Search customer, service or reference…'}/></label>{kind === 'bookings' && <select aria-label="Filter booking status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="all">All statuses</option>{['pending','confirmed','in-progress','completed','cancelled'].map(value => <option value={value} key={value}>{statusName(value)}</option>)}</select>}</div>
    <div className="metric-details-body" aria-busy={loading}>
      {loading ? <div className="metric-empty" role="status"><Loader2 className="animate-spin" size={26}/><p>Loading {meta.title.toLowerCase()}…</p></div>
        : error ? <div className="metric-empty" role="alert"><p>{error}</p><button onClick={() => void load()}>Try again</button></div>
        : count === 0 ? <div className="metric-empty"><Icon size={28}/><h3>{query || status !== 'all' ? 'No matching results' : 'Nothing to show yet'}</h3><p>{query || status !== 'all' ? 'Try another search or status filter.' : kind === 'revenue' ? 'Revenue appears after work is completed and cash is confirmed.' : 'New records will appear here when available.'}</p></div>
        : isDirectory ? <div className="metric-directory">{filteredAccounts.slice(offset, offset + pageSize).map(account => {
          const jobs = memberJobs(account), active = jobs.filter(job => ['pending','confirmed','in-progress'].includes(job.status)).length, completed = jobs.filter(job => job.status === 'completed').length;
          return <article key={account._id} className="metric-person"><span className="metric-avatar">{account.name.split(/\s+/).map(part => part[0]).join('').slice(0,2).toUpperCase()}</span><div className="metric-person-content"><h3>{account.name}</h3><div className="metric-contact"><span><Mail size={13}/>{account.email || 'Email not provided'}</span><span><Phone size={13}/>{account.phone || 'Phone not provided'}</span></div><div className="metric-person-stats"><span><b>{jobs.length}</b> {kind === 'customers' ? 'bookings' : 'assigned jobs'}</span><span><b>{active}</b> active</span><span><b>{completed}</b> work completed</span></div></div></article>;
        })}</div>
        : <div className="metric-bookings">{filteredBookings.slice(offset, offset + pageSize).map(booking => <article className="metric-booking" key={booking._id}><span className="metric-booking-icon"><CalendarDays size={18}/></span><div className="metric-booking-info"><h3>{booking.serviceSnapshot?.name || booking.service?.name || 'Unavailable service'}</h3><p>{booking.user?.name || booking.customerSnapshot?.name || 'Unavailable customer'} <span>· #{booking._id.slice(-6).toUpperCase()}</span></p><small>{date(booking.scheduledDate)} · {booking.scheduledTime}{kind === 'revenue' ? ' · Cash confirmed: ' + date(booking.paymentConfirmedAt) : ''}</small><div className="metric-booking-labels"><span className={'metric-status metric-status-' + booking.status}>{statusName(booking.status)}</span><span className={booking.paymentStatus === 'paid' ? 'metric-cash-paid' : 'metric-cash-pending'}>{booking.paymentStatus === 'paid' ? 'Cash confirmed' : 'Cash not confirmed'}</span></div></div><div className="metric-booking-amount"><strong>{money(booking.totalAmount)}</strong><button type="button" onClick={() => setSelected(booking)}>View booking <ArrowUpRight size={13}/></button></div></article>)}</div>}
    </div>
    <footer className="metric-details-footer"><span>{loading || error ? '—' : count ? `${offset + 1}–${Math.min(offset + pageSize, count)} of ${count} results` : '0 results'}</span><div><button type="button" aria-label="Previous results page" disabled={loading || currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16}/></button><span>{currentPage} / {pages}</span><button type="button" aria-label="Next results page" disabled={loading || currentPage >= pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16}/></button></div></footer>
  </dialog>{selected && <BookingDetailsModal booking={selected} onClose={() => { setSelected(null); void load(); onUpdated(); }}/>}</>;
}
