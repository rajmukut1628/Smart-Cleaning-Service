import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowUpRight, Briefcase, ChevronRight, Layers3, RefreshCw, Settings2, ShieldCheck, Sparkles, Users, Wand2 } from 'lucide-react';
import {useAuth} from '../../context/authState';
import ServiceManagement from './ServiceManagement';
import UnitManagement from './UnitManagement';
import AdminManagement from './AdminManagement';
import BulkOperations from './BulkOperations';
import WorkerManagement from './WorkerManagement';
import UserManagement from './UserManagement';
import { MANAGEMENT_UPDATED } from './managementEvents';

const modules = [
  { id: 'users', label: 'People', detail: 'Accounts & roles', icon: Users, component: UserManagement },
  { id: 'workers', label: 'Workforce', detail: 'Team profiles', icon: Briefcase, component: WorkerManagement },
  { id: 'services', label: 'Service catalog', detail: 'Services & pricing', icon: Sparkles, component: ServiceManagement },
  { id: 'admins', label: 'Ownership & access', detail: 'Owner & administrators', icon: ShieldCheck, component: AdminManagement },
  { id: 'units', label: 'Measurement units', detail: 'Booking configuration', icon: Layers3, component: UnitManagement },
  { id: 'bulk', label: 'Bulk actions', detail: 'Manage records together', icon: Wand2, component: BulkOperations },
] as const;
interface AccountSummary { _id: string; role: string }
interface Overview { customers: number; workers: number; admins: number; services: number; accounts: number }

export default function ManagementWorkspace() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const active = modules.find(module => module.id === params.get('module')) || modules[0];
  const Component = active.component;
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [revision, setRevision] = useState(0);
  const fetchOverview = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const [people, services] = await Promise.all([axios.get<AccountSummary[]>('/api/admin/users'), axios.get<unknown[]>('/api/services')]);
      const accounts = people.data;
      setOverview({customers:accounts.filter(account=>account.role==='user').length,workers:accounts.filter(account=>account.role==='worker').length,admins:accounts.filter(account=>['admin','superadmin'].includes(account.role)).length,services:services.data.length,accounts:accounts.length});
      setUpdated(new Date());
    } catch { setFailed(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchOverview(); }, [fetchOverview, active.id]);
  useEffect(() => { const refresh = () => { fetchOverview(); }; window.addEventListener(MANAGEMENT_UPDATED, refresh); return () => window.removeEventListener(MANAGEMENT_UPDATED, refresh); }, [fetchOverview]);
  const select = (id: string) => setParams(previous => { const next = new URLSearchParams(previous); next.delete('tab'); next.set('module',id); return next; });
  const cards = [
    {label:'Customer accounts',value:overview?.customers,note:'Registered customers',target:'users',icon:Users},
    {label:'Workforce',value:overview?.workers,note:'Cleaning professionals',target:'workers',icon:Briefcase},
    {label:'Service catalog',value:overview?.services,note:'Available services',target:'services',icon:Sparkles},
    {label:'Administrators',value:overview?.admins,note:'Admin & superadmin',target:'admins',icon:ShieldCheck},
  ];
  return <div className="space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-blue-600"><Settings2 size={12} />Administration workspace</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Management studio<span className="text-blue-600">.</span></h1><p className="mt-1 text-xs text-slate-500">Your people, services and operations. One organized workspace.</p></div><div className="flex flex-col items-end gap-2"><button disabled={loading} onClick={() => {fetchOverview();setRevision(value=>value+1);}} className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-blue-300 hover:text-blue-700"><RefreshCw size={14} className={loading?'animate-spin':''} />Refresh workspace</button>{updated && <span className="text-[10px] text-slate-400">Updated {updated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>}</div></div>
    {failed && <p role="alert" className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">Overview could not be refreshed. Use Refresh workspace to try again.</p>}
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">{cards.map(card=><button key={card.label} onClick={()=>select(card.target)} className={'group flex min-w-0 items-center gap-3 rounded-xl border bg-white px-3 py-3 text-left transition hover:border-blue-300 hover:shadow-sm sm:px-4 '+(active.id===card.target?'border-blue-300 shadow-sm shadow-blue-100/50':'border-slate-200/70')}><span className="hidden shrink-0 rounded-lg bg-blue-50 p-2 text-blue-600 sm:inline-flex"><card.icon size={16} strokeWidth={1.7}/></span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold text-slate-600 sm:text-[11px]">{card.label}</span><span className="mt-1 block truncate text-[9px] text-slate-400">{card.note}</span></span><span className="shrink-0 text-2xl font-bold tracking-tight text-slate-900">{loading?'…':card.value??'—'}</span><ArrowUpRight size={12} aria-hidden="true" className="hidden shrink-0 text-slate-300 transition group-hover:text-blue-600 xl:block"/></button>)}</div>
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
      <aside className="min-w-0 rounded-2xl border border-blue-100 bg-white p-2 shadow-sm"><p className="px-3 pb-2 pt-3 text-[9px] font-bold uppercase tracking-[.2em] text-slate-400">Workspace navigation</p><nav aria-label="Management modules" className="flex gap-1 overflow-x-auto lg:flex-col">{modules.map(module=><button key={module.id} aria-current={active.id===module.id?'page':undefined} onClick={()=>select(module.id)} className={'group flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left transition '+(active.id===module.id?'bg-blue-600 text-white shadow-sm shadow-blue-200':'text-slate-500 hover:bg-blue-50 hover:text-blue-700')}><module.icon size={18} strokeWidth={1.7} className="shrink-0" /><span className="min-w-0"><span className="block whitespace-nowrap text-xs font-semibold">{module.label}</span><span className={'mt-0.5 hidden text-[10px] lg:block '+(active.id===module.id?'text-blue-100':'text-slate-400')}>{module.detail}</span></span><ChevronRight size={13} className="ml-auto hidden shrink-0 lg:block" /></button>)}</nav><div className="mx-1 mb-1 mt-3 hidden items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/50 p-2 lg:flex"><ShieldCheck size={14} className="shrink-0 text-blue-600"/><p className="text-[10px] font-semibold text-blue-950">{user?.role==='superadmin'?'Superadmin workspace':'Admin workspace'}</p></div></aside>
      <section className="management-content min-w-0" aria-label={active.label}><Component key={active.id+revision} /></section>
    </div>
  </div>;
}
