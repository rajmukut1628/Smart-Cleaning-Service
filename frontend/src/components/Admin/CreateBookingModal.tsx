import { resolveServiceUnit, serviceUnitRate } from '../../utils/servicePricing';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarDays, MapPin, ShieldCheck, Sparkles, UserRound, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import {useAuth} from '../../context/authState';
import BookingDialog from '../Services/BookingDialog';
interface Customer { _id: string; name: string; email?: string; phone?: string; address?: string; role?: string }
interface UnitConfig { unitType: string; label: string; options?: { label: string; value: number }[]; allowCustom?: boolean }
interface Service { _id: string; name: string; basePrice: number; pricePerSqFt?: number; pricePerUnit?: number; unitConfig?: UnitConfig }
interface Worker { _id: string; name: string }
export default function CreateBookingModal({ onBookingCreated }: { onBookingCreated: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', password: '' });
  const [form, setForm] = useState({ customer: '', service: '', worker: '', address: '', units: '1', date: '', time: '09:00' });
  const [custom, setCustom] = useState(false);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  useEffect(() => {
    if (!open || !isAdmin) return;
    const controller = new AbortController();setLoading(true);setFetchError('');
    Promise.all([axios.get<Customer[]>('/api/admin/users?role=user', { signal: controller.signal }), axios.get<Service[]>('/api/services', { signal: controller.signal }), axios.get<Worker[]>('/api/admin/workers', { signal: controller.signal })])
      .then(([people, catalog, team]) => { setCustomers(people.data.filter(customer => !customer.role || customer.role === 'user'));setServices(catalog.data);setWorkers(team.data); })
      .catch(() => { if (!controller.signal.aborted) setFetchError('Could not load booking options. Please try again.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, isAdmin, retry]);
  const service = services.find(item => item._id === form.service);
  const customer = customers.find(item => item._id === form.customer);
  const config = service ? resolveServiceUnit(service) : undefined;
  const unitType = config?.unitType || 'unit';
  const rate = service && config ? serviceUnitRate(service, config) : 0;
  const total = (service?.basePrice || 0) + (Number(form.units) || 0) * rate;
  const change = (key: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const chooseCustomer = (id: string) => { const selected = customers.find(item => item._id === id); setForm(previous => ({ ...previous, customer: id, address: selected?.address || '' })); };
  const close = () => { if (!busy) setOpen(false); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();if (busy) return;setError('');
    if (!form.address.trim() || !service || Number(form.units) < 1) { setError('Complete the service, address and quantity.');return; }
    setBusy(true);
    try {
      let customerId = form.customer;
      if (isNew) {
        const { data } = await axios.post<Customer>('/api/admin/users', { name: newCustomer.name.trim(), email: newCustomer.email.trim().toLowerCase(), phone: newCustomer.phone.trim(), password: newCustomer.password, role: 'user' });
        customerId = data._id;setCustomers(previous => [...previous, data]);setForm(previous => ({ ...previous, customer: data._id }));setIsNew(false);setNewCustomer({ name: '', email: '', phone: '', password: '' });
      }
      if (!customerId) { setError('Select a customer for this booking.');return; }
      await axios.post('/api/admin/bookings', { user: customerId, service: form.service, worker: form.worker || undefined, address: form.address.trim(), squareFootage: Number(form.units), scheduledDate: form.date, scheduledTime: form.time, totalAmount: total });
      onBookingCreated();toast.success('Booking created successfully.');setOpen(false);setForm({ customer: '', service: '', worker: '', address: '', units: '1', date: '', time: '09:00' });setIsNew(false);setCustom(false);
    } catch (err) { setError(axios.isAxiosError(err) ? (axios.isAxiosError<{message:string}>(err)?err.response?.data.message:undefined) || 'Could not create the booking. Please try again.' : 'Could not create the booking.'); }
    finally { setBusy(false); }
  };
  if (!isAdmin) return null;
  return <><button onClick={() => { setError('');setOpen(true); }} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700">Create Booking</button>{open && <BookingDialog title="Create a customer booking." eyebrow="ADMIN BOOKING DESK" description="Choose the customer, service and schedule. Assign a worker now or later." busy={busy} onClose={close}><form className="bf-form" onSubmit={submit}><div className="bf-scroll">{loading ? <p className="bf-loading" role="status">Loading customers, services and workers…</p> : fetchError ? <div className="bf-error" role="alert">{fetchError} <button type="button" onClick={() => setRetry(n => n + 1)}>Try again</button></div> : <div className="bf-layout"><fieldset disabled={busy} className="bf-fields"><section className="bf-section"><h3><UserRound size={17}/>Customer information</h3><div className="bf-mode"><button type="button" aria-pressed={!isNew} onClick={() => {setIsNew(false);setError('');}}>Existing customer</button><button type="button" aria-pressed={isNew} onClick={() => {setIsNew(true);change('address','');setError('');}}>New customer</button></div>{isNew ? <div className="bf-grid">{([{ key: 'name', label: 'Full name', type: 'text' }, { key: 'phone', label: 'Phone number', type: 'tel' }, { key: 'email', label: 'Email address', type: 'email' }, { key: 'password', label: 'Initial password', type: 'password' }] as const).map(field => <label key={field.key}>{field.label}<input required type={field.type} minLength={field.key === 'password' ? 8 : undefined} autoComplete={field.key === 'password' ? 'new-password' : 'off'} value={newCustomer[field.key]} onChange={event => setNewCustomer(previous => ({ ...previous, [field.key]: event.target.value }))}/></label>)}<p className="bf-help bf-wide">Create a customer account, then save their booking. The customer can change this initial password in Settings.</p></div> : <><label>Select customer<select required value={form.customer} onChange={event => chooseCustomer(event.target.value)}><option value="">Choose a customer</option>{customers.map(item => <option key={item._id} value={item._id}>{item.name}{item.email ? ' · ' + item.email : ''}</option>)}</select></label>{customer && <div className="bf-contact"><strong>{customer.name}</strong><span>{customer.email}</span><span>{customer.phone || 'No phone added'}</span></div>}{!customers.length && <p className="bf-help">No customers yet. Choose New customer to create one.</p>}</>}</section>
    <section className="bf-section"><h3><Sparkles size={17}/>Service & quantity</h3><label>Service<select required value={form.service} onChange={event => {change('service',event.target.value);setCustom(false);}}><option value="">Choose a service</option>{services.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>{service && <div className="bf-instructions"><label>{config?.label || 'Quantity / size'}</label>{unitType === 'square' ? <input aria-label="Service area" required type="number" min="1" step="1" value={form.units} onChange={event => change('units',event.target.value)}/> : <><div className="bf-quantity">{[1,2,3,4,5,10].map(value => <button key={value} type="button" aria-pressed={!custom && form.units === String(value)} onClick={() => {change('units',String(value));setCustom(false);}}>{value}</button>)}<button type="button" aria-pressed={custom} onClick={() => setCustom(true)}>Custom</button></div>{custom && <input aria-label="Custom quantity" required type="number" min="1" step="1" value={form.units} onChange={event => change('units',event.target.value)}/>}</>}</div>}</section>
    <section className="bf-section"><h3><MapPin size={17}/>Service location</h3><label>Address<textarea required maxLength={500} rows={2} value={form.address} onChange={event => change('address',event.target.value)} placeholder="House, road, area and city"/></label><p className="bf-help">Filled from the selected customer’s saved address when available.</p></section>
    <section className="bf-section"><h3><CalendarDays size={17}/>Schedule & assignment</h3><div className="bf-grid"><label>Date<input required type="date" value={form.date} onInput={event => change('date',event.currentTarget.value)} onChange={event => change('date',event.target.value)}/></label><label>Time<input required type="time" value={form.time} onInput={event => change('time',event.currentTarget.value)} onChange={event => change('time',event.target.value)}/></label></div><label className="bf-instructions"><Users size={14} className="inline"/>Assign worker <small>Optional</small><select value={form.worker} onChange={event => change('worker',event.target.value)}><option value="">Assign later</option>{workers.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label></section></fieldset>
    <aside className="bf-summary"><span className="bf-summary-icon"><Sparkles size={22}/></span><p className="bf-eyebrow">BOOKING SUMMARY</p><h3>{service?.name || 'Choose a service'}</h3><p className="bf-schedule">{isNew ? newCustomer.name || 'New customer' : customer?.name || 'No customer selected'}</p><div className="bf-price-line"><span>Base price</span><strong>৳{(service?.basePrice || 0).toLocaleString()}</strong></div><div className="bf-price-line"><span>{form.units || '0'} × ৳{rate.toLocaleString()}</span><strong>৳{((Number(form.units) || 0) * rate).toLocaleString()}</strong></div><div className="bf-total"><span>Calculated amount</span><strong>৳{total.toLocaleString()}</strong></div><div className="bf-payment"><ShieldCheck size={18}/><p><strong>Customer booking</strong><span>{form.worker ? 'A worker will be assigned to this booking.' : 'Worker assignment can be completed later.'}</span></p></div>{form.date && <p className="bf-schedule">{form.date} · {form.time}</p>}</aside></div>}{error && <p className="bf-error" role="alert">{error}</p>}</div><footer className="bf-footer"><p>Review the customer and schedule.</p><button type="button" className="bf-secondary" disabled={busy} onClick={close}>Cancel</button><button className="bf-primary" disabled={busy || loading || !!fetchError}>{busy ? 'Saving…' : 'Save booking'}</button></footer></form></BookingDialog>}</>;
}
