import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { CalendarDays, Check, Loader2, MapPin, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Service } from '../../types';
import BookingDialog from './BookingDialog';
interface UnitConfig { _id: string; unitType: string; label: string; isActive: boolean; customPlaceholder?: string }
interface Props { service: Service; onClose: () => void }
export default function BookingModal({ service, onClose }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState({ address: user?.address || '', areaUnit: '', squareFootage: '1', scheduledDate: '', scheduledTime: '', specialInstructions: '' });
  const [contact, setContact] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [configs, setConfigs] = useState<UnitConfig[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [custom, setCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const addressEdited = useRef(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (user?.role !== 'user') return;
    const controller = new AbortController(); setProfileError(false);
    axios.get('/api/profile', { signal: controller.signal }).then(({ data }) => {
      if (data._id !== user.id || data.role !== 'user') throw new Error('Account mismatch');
      setContact({ name: data.name, email: data.email, phone: data.phone || '' });
      if (!addressEdited.current) setForm(previous => ({ ...previous, address: data.address || previous.address }));
    }).catch(() => { if (!controller.signal.aborted) setProfileError(true); });
    return () => controller.abort();
  }, [user?.id, user?.role]);
  useEffect(() => {
    const controller = new AbortController(); setConfigLoading(true); setConfigError(false);
    axios.get<UnitConfig[]>('/api/unit-configs', { signal: controller.signal }).then(({ data }) => {
      setConfigs(data); const linkedId = typeof service.unitConfig === 'object' ? (service.unitConfig as { _id?: string })?._id : service.unitConfig;
      const selected = data.find(config => config._id === linkedId) || (!linkedId ? data[0] : undefined);
      setForm(previous => ({ ...previous, areaUnit: selected?.unitType || '' }));
    }).catch(() => { if (!controller.signal.aborted) setConfigError(true); }).finally(() => { if (!controller.signal.aborted) setConfigLoading(false); });
    return () => controller.abort();
  }, [service.unitConfig, retry]);
  const config = configs.find(item => item.unitType === form.areaUnit);
  const perUnit = (service as Service & { pricePerUnit?: number }).pricePerUnit || 0;
  const needsUnits = service.pricePerSqFt > 0 || perUnit > 0 || !!service.unitConfig;
  const rate = config?.unitType === 'square' ? service.pricePerSqFt || 0 : perUnit;
  const total = (service.basePrice || 0) + (Number(form.squareFootage) || 0) * rate;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
  const change = (key: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    if (!form.address.trim() || needsUnits && (!config || Number(form.squareFootage) < 1)) { setError('Enter your service address and a valid service quantity.'); return; }
    setBusy(true); setError('');
    try { await axios.post('/api/bookings', { unitType: form.areaUnit, serviceId: service.id || (service as Service & { _id?: string })._id, address: form.address.trim(), squareFootage: parseInt(form.squareFootage) || 0, scheduledDate: form.scheduledDate, scheduledTime: form.scheduledTime, specialInstructions: form.specialInstructions }); toast.success('Booking created. You can track it in your dashboard.'); onClose(); }
    catch (err) { setError(axios.isAxiosError(err) ? err.response?.data?.message || 'Could not create your booking. Please try again.' : 'Could not create your booking.'); }
    finally { setBusy(false); }
  };
  if (user?.role !== 'user') return null;
  return <BookingDialog title="Plan your next clean." eyebrow="CUSTOMER BOOKING" description="Choose your schedule. We’ll take care of the rest." busy={busy} onClose={onClose}><form onSubmit={submit} className="bf-form"><div className="bf-scroll"><div className="bf-layout"><div className="bf-fields"><section className="bf-section"><h3><UserRound size={17}/>Your contact details <span>From your profile</span></h3><div className="bf-contact"><strong>{contact.name}</strong><span>{contact.email}</span><span>{contact.phone || 'Phone not added'}</span></div>{profileError && <p className="bf-help">Couldn’t refresh your profile. Check your contact details and address before booking.</p>}<Link className="bf-link" to="/profile" onClick={onClose}>Update my profile →</Link></section>
    <section className="bf-section"><h3><MapPin size={17}/>Where should we clean?</h3><label>Service address<textarea required maxLength={500} rows={2} value={form.address} onChange={event => { addressEdited.current = true; change('address', event.target.value); }} placeholder="House, road, area, city and landmarks"/></label><p className="bf-help">Your saved address is filled in automatically. You can change it for this booking.</p></section>
    {needsUnits && <section className="bf-section"><h3><Sparkles size={17}/>{config?.label || 'Service quantity'}</h3>{configLoading ? <p role="status" className="bf-help"><Loader2 size={14} className="inline animate-spin"/> Loading options…</p> : configError || !config ? <div role="alert" className="bf-error">Service options could not be loaded. <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button></div> : config.unitType === 'square' ? <label>Area in square feet<input required type="number" min="1" step="1" value={form.squareFootage} onChange={event => change('squareFootage', event.target.value)} placeholder={config.customPlaceholder || 'Enter total area'}/></label> : <><div className="bf-quantity">{[1,2,3,4,5,10].map(value => <button type="button" key={value} aria-pressed={!custom && form.squareFootage === String(value)} onClick={() => { change('squareFootage', String(value)); setCustom(false); }}>{value}</button>)}<button type="button" aria-pressed={custom} onClick={() => setCustom(true)}>Custom</button></div>{custom && <label>Quantity<input required type="number" min="1" step="1" value={form.squareFootage} onChange={event => change('squareFootage', event.target.value)}/></label>}</>}</section>}
    <section className="bf-section"><h3><CalendarDays size={17}/>Choose your schedule</h3><div className="bf-grid"><label>Preferred date<input required type="date" min={today} value={form.scheduledDate} onInput={event => change('scheduledDate', event.currentTarget.value)} onChange={event => change('scheduledDate', event.target.value)}/></label><label>Preferred time<select required value={form.scheduledTime} onChange={event => change('scheduledTime', event.target.value)}><option value="">Select a time</option>{[['09:00','09:00 AM'],['10:00','10:00 AM'],['11:00','11:00 AM'],['14:00','02:00 PM'],['15:00','03:00 PM'],['16:00','04:00 PM']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><label className="bf-instructions">Special instructions <small>Optional</small><textarea maxLength={2000} rows={2} value={form.specialInstructions} onChange={event => change('specialInstructions', event.target.value)} placeholder="Anything your cleaning team should know?"/></label></section></div>
    <aside className="bf-summary"><span className="bf-summary-icon"><Sparkles size={22}/></span><p className="bf-eyebrow">YOUR SERVICE</p><h3>{service.name}</h3><div className="bf-price-line"><span>Base price</span><strong>৳{service.basePrice.toLocaleString()}</strong></div>{needsUnits && config && <div className="bf-price-line"><span>{form.squareFootage || '0'} × ৳{rate.toLocaleString()}</span><strong>৳{((Number(form.squareFootage) || 0) * rate).toLocaleString()}</strong></div>}<div className="bf-total"><span>Service total</span><strong>৳{total.toLocaleString()}</strong></div><div className="bf-payment"><ShieldCheck size={18}/><p><strong>Cash after service</strong><span>Your payment updates when an administrator confirms receipt.</span></p></div>{form.scheduledDate && <p className="bf-schedule">{form.scheduledDate} {form.scheduledTime && '· ' + form.scheduledTime}</p>}</aside></div>{error && <p className="bf-error" role="alert">{error}</p>}</div><footer className="bf-footer"><p><Check size={14}/>Review your details before confirming.</p><button type="button" className="bf-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="bf-primary" disabled={busy || needsUnits && (configLoading || configError || !config)}>{busy ? 'Confirming…' : 'Confirm booking'}</button></footer></form></BookingDialog>;
}
