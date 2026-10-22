import { useEffect, useState } from 'react';
import axios from 'axios';
import { CreditCard, Loader2 } from 'lucide-react';
import {useAuth} from '../../context/authState';
import './user-profile.css';
interface Spending { totalSpent: number; totalBookings: number; monthlySpending: Record<string, number> }
const money = (amount: number) => '৳' + new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 }).format(amount);
export default function CustomerSpending() {
  const { user } = useAuth(); const [data, setData] = useState<Spending | null>(null); const [error, setError] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => { if (user?.role !== 'user') return; const controller = new AbortController();setError(false);setData(null);
    axios.get('/api/profile/spending-analytics', { signal: controller.signal }).then(result => setData(result.data)).catch(() => { if (!controller.signal.aborted) setError(true); });return () => controller.abort();
  }, [user?.id, user?.role, retry]);
  if (user?.role !== 'user') return null;
  return <section className="cp-panel mt-4"><div className="cp-panel-head"><div><h2 className="flex items-center gap-2"><CreditCard size={17} className="text-blue-600"/>Spending analytics</h2><p>Your completed bookings with confirmed payments.</p></div></div>{error ? <div className="p-4 text-xs text-slate-500" role="alert">Unable to load spending. <button className="cp-secondary" onClick={() => setRetry(n => n + 1)}>Try again</button></div> : !data ? <div className="p-5 text-xs text-slate-500" role="status"><Loader2 className="inline animate-spin" size={16}/> Loading your spending…</div> : <div className="cp-spending"><div className="cp-stat-row">{[{ label: 'Total spent', value: money(data.totalSpent) }, { label: 'Paid bookings', value: data.totalBookings }, { label: 'Average per booking', value: money(data.totalBookings ? data.totalSpent / data.totalBookings : 0) }].map(stat => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div>{data.totalBookings ? <><h3>Monthly spending</h3>{Object.entries(data.monthlySpending).sort(([a], [b]) => Date.parse(b) - Date.parse(a)).map(([month, amount]) => <div className="cp-month" key={month}><span>{month}</span><strong>{money(amount)}</strong></div>)}</> : <p className="text-xs text-slate-500">Your spending appears after a completed service is marked paid.</p>}</div>}</section>;
}
