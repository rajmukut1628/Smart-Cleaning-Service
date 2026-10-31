import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Briefcase, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Loader2, MapPin, RefreshCw, Search, X } from 'lucide-react';
import { dateLabel, statusLabel, type Job } from './workerData';

export type WorkerMetric = 'assigned' | 'active' | 'completed';
const headings = {
  assigned: { title: 'Your assigned jobs', description: 'Every job assigned to your account, across all work statuses.', icon: Briefcase },
  active: { title: 'Your active assignments', description: 'Confirmed jobs and work in progress. Open an assignment to take the next step.', icon: Clock3 },
  completed: { title: 'Your completed work', description: 'Jobs you have finished. Work completion is separate from cash confirmation.', icon: CheckCircle2 },
};
const pageSize = 6;
export default function WorkerMetricDetails({ kind, jobs, loading, error, onRefresh, onOpenJob, onClose }: {
  kind: WorkerMetric; jobs: Job[]; loading: boolean; error: string; onRefresh: () => void;
  onOpenJob: (job: Job) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialog?.showModal(); input.current?.focus();
    return () => { dialog?.close(); document.body.style.overflow = overflow; if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  const eligible = jobs.filter(job => kind === 'active' ? ['confirmed', 'in-progress'].includes(job.status) : kind === 'completed' ? job.status === 'completed' : true);
  const query = search.trim().toLowerCase();
  const filtered = eligible.filter(job => (status === 'all' || job.status === status) && [job._id, job.service?.name, job.user?.name, job.address, job.user?.address].some(value => value?.toLowerCase().includes(query)))
    .sort((a, b) => { const order = a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime); return kind === 'completed' ? -order : order; });
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)), currentPage = Math.min(page, pages), offset = (currentPage - 1) * pageSize;
  const meta = headings[kind], Icon = meta.icon;
  return <dialog ref={ref} className={'worker-metric-dialog worker-metric-' + kind} aria-labelledby="worker-metric-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="worker-metric-header"><div><span className="worker-metric-eyebrow">YOUR WORK / DETAILS</span><h2 id="worker-metric-title"><Icon size={23}/>{meta.title}</h2><p>{meta.description}</p></div><button type="button" aria-label="Close job summary" onClick={onClose}><X size={19}/></button></header>
    <section className="worker-metric-summary" aria-label="Assignment summary"><div><span>{kind === 'completed' ? 'Work completed' : kind === 'active' ? 'Ready or in progress' : 'Assigned to you'}</span><strong>{loading || error ? '—' : eligible.length}<small>{eligible.length === 1 ? 'job' : 'jobs'}</small></strong></div><p><span/>{kind === 'active' ? 'Your next actions, all in one place' : kind === 'completed' ? 'Your finished assignment records' : 'Only your assigned job records'}</p><button type="button" disabled={loading} aria-label="Refresh your jobs" onClick={onRefresh}><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/></button></section>
    <div className="worker-metric-filters"><label><Search size={16}/><input ref={input} aria-label="Search your assignments" placeholder="Search service, customer, address or reference…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }}/></label>{kind !== 'completed' && <select aria-label="Filter your job status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="all">All statuses</option>{(kind === 'active' ? ['confirmed','in-progress'] : ['pending','confirmed','in-progress','completed','cancelled']).map(value => <option value={value} key={value}>{statusLabel(value)}</option>)}</select>}</div>
    <div className="worker-metric-body" aria-busy={loading}>
      {error ? <div className="worker-metric-empty" role="alert"><p>{error}</p><button type="button" onClick={onRefresh}>Try again</button></div> : loading ? <div className="worker-metric-empty" role="status"><Loader2 size={26} className="animate-spin"/><p>Loading your assignments…</p></div> : !filtered.length ? <div className="worker-metric-empty"><Icon size={30}/><h3>{query || status !== 'all' ? 'No matching assignments' : kind === 'completed' ? 'No completed jobs yet' : kind === 'active' ? 'No active assignments' : 'No jobs assigned yet'}</h3><p>{query || status !== 'all' ? 'Try another search or status filter.' : kind === 'completed' ? 'Your finished work will appear here after you complete a job.' : 'Jobs assigned to you by an administrator will appear here.'}</p></div> : <div className="worker-metric-jobs">{filtered.slice(offset, offset + pageSize).map(job => <article key={job._id} className="worker-metric-job"><div className="worker-metric-job-top"><span className={'worker-status status-' + job.status}>{statusLabel(job.status)}</span><span>#{job._id.slice(-6).toUpperCase()}</span></div><h3>{job.service?.name || 'Service unavailable'}</h3><p className="worker-metric-customer">{job.user?.name || 'Customer unavailable'}</p><div className="worker-metric-schedule"><span><CalendarDays size={14}/>{dateLabel(job.scheduledDate)} · {job.scheduledTime}</span><span><MapPin size={14}/>{job.address || job.user?.address || 'Address not provided'}</span></div><button type="button" onClick={() => onOpenJob(job)}>{job.status === 'completed' ? 'View completed assignment' : ['confirmed','in-progress'].includes(job.status) ? 'View assignment & actions' : 'View assignment'}<ArrowUpRight size={14}/></button></article>)}</div>}
    </div>
    <footer className="worker-metric-footer"><span>{loading || error ? '—' : filtered.length ? `${offset + 1}–${Math.min(offset + pageSize, filtered.length)} of ${filtered.length} jobs` : '0 jobs'}</span><div><button type="button" aria-label="Previous assignments page" disabled={loading || currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16}/></button><span>{currentPage} / {pages}</span><button type="button" aria-label="Next assignments page" disabled={loading || currentPage >= pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16}/></button></div></footer>
  </dialog>;
}
