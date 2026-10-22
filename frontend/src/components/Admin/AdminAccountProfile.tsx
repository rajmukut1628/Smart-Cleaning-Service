import VerifiedEmailChange from '../common/VerifiedEmailChange';
import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Camera, Check, Mail, MapPin, Pencil, Phone, ShieldCheck, UserRound, X } from 'lucide-react';
import {useAuth} from '../../context/authState';
import { API_BASE_URL } from '../../config/apiConfig';

interface AdminAccount {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  profilePicture?: string;
  role: 'admin' | 'superadmin';
  createdAt?: string;
}
type ProfileForm = Pick<AdminAccount, 'name' | 'email'> & { phone: string; address: string };
const formFor = (account: AdminAccount): ProfileForm => ({ name: account.name, email: account.email, phone: account.phone || '', address: account.address || '' });
const messageFor = (error: unknown, fallback: string) => axios.isAxiosError<{message?: string}>(error) ? (axios.isAxiosError<{message:string}>(error)?error.response?.data.message:undefined) || fallback : fallback;
const pictureUrl = (path?: string) => !path ? '' : path.startsWith('/') ? API_BASE_URL + path : path;

export default function AdminAccountProfile() {
  const { updateUserProfile } = useAuth();
  const [account, setAccount] = useState<AdminAccount | null>(null);
  const [form, setForm] = useState<ProfileForm>({ name: '', email: '', phone: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pictureFailed, setPictureFailed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const fetchProfile = useCallback(async () => {
    setLoading(true); setFailed(false);
    try { const { data } = await axios.get<AdminAccount>('/api/profile'); setAccount(data); setForm(formFor(data)); }
    catch { setFailed(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const syncAccount = (updated: AdminAccount) => {
    setAccount(updated); setForm(formFor(updated));
    updateUserProfile({ name: updated.name, email: updated.email, phone: updated.phone || '', address: updated.address || '', profilePicture: updated.profilePicture, avatar: pictureUrl(updated.profilePicture) });
  };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) { toast.error('Name and phone number are required'); return; }
    setSaving(true);
    try {
      const { data } = await axios.put<{user: AdminAccount}>('/api/profile', { name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() });
      syncAccount(data.user); setEditing(false); toast.success('Profile updated');
    } catch (error) { toast.error(messageFor(error, 'Could not update profile')); }
    finally { setSaving(false); }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) { toast.error('Choose a JPG, PNG, WebP or GIF image up to 5MB'); if (fileInput.current) fileInput.current.value = ''; return; }
    const body = new FormData(); body.append('profilePicture', file); setUploading(true);
    try { const { data } = await axios.put<{user: AdminAccount}>('/api/profile/picture', body); syncAccount(data.user); setPictureFailed(false); toast.success('Profile photo updated'); }
    catch (error) { toast.error(messageFor(error, 'Could not upload photo')); }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = ''; }
  };
  if (loading) return <div role="status" className="mx-auto max-w-5xl animate-pulse rounded-2xl border border-blue-100 bg-white p-10 text-sm text-slate-400">Loading your account…</div>;
  if (failed || !account) return <div role="alert" className="mx-auto max-w-5xl rounded-2xl border border-blue-100 bg-white p-5 text-center"><p className="text-sm text-slate-500">Unable to load your profile.</p><button onClick={fetchProfile} className="mt-4 rounded-xl bg-blue-600 px-5 py-2 text-sm text-white">Try again</button></div>;
  const roleLabel = account.role === 'superadmin' ? 'Super administrator' : 'Administrator';
  const initials = account.name.trim().split(/\s+/).slice(0,2).map(part => part.charAt(0)).join('').toUpperCase();
  const joined = account.createdAt && Number.isFinite(Date.parse(account.createdAt)) ? new Date(account.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';
  const fields = [
    { key: 'name', label: 'Full name', type: 'text', icon: UserRound, required: true, autoComplete: 'name' },
    { key: 'email', label: 'Email address', type: 'email', icon: Mail, required: true, autoComplete: 'email' },
    { key: 'phone', label: 'Phone number', type: 'tel', icon: Phone, required: true, autoComplete: 'tel' },
    { key: 'address', label: 'Address', type: 'text', icon: MapPin, required: false, autoComplete: 'street-address' },
  ] as const;
  return <div className="mx-auto max-w-5xl space-y-5">
    <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-600">My account</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Account profile</h1><p className="mt-1 text-sm text-slate-500">Your personal details and contact information.</p></div>
    <div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm"><div className="h-20 bg-gradient-to-br from-blue-950 via-blue-800 to-blue-500" /><div className="px-6 pb-6">
        <div className="relative -mt-10 mb-4 w-fit"><div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-blue-50 text-2xl font-bold text-blue-600 shadow-sm">{account.profilePicture && !pictureFailed ? <img src={pictureUrl(account.profilePicture)} alt={account.name} onError={() => setPictureFailed(true)} className="h-full w-full object-cover" /> : initials}</div><button disabled={uploading || saving || editing} onClick={() => fileInput.current?.click()} aria-label="Change profile photo" className="absolute -bottom-1 -right-2 rounded-full border-2 border-white bg-blue-600 p-2 text-white shadow-sm hover:bg-blue-700"><Camera size={14} /></button></div>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => upload(event.target.files?.[0])} className="hidden" aria-label="Upload profile photo" />
        <h2 className="break-words text-lg font-bold text-slate-900">{account.name}</h2><span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700"><ShieldCheck size={13} />{roleLabel}</span>
        {joined && <p className="mt-4 text-xs text-slate-400">Member since {joined}</p>}
        <p aria-live="polite" className="mt-3 text-[11px] text-slate-400">{uploading ? 'Uploading photo…' : 'Profile photo · JPG, PNG, WebP or GIF · Up to 5MB'}</p>
      </div></aside>
      <div className="space-y-5">
        <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-4"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-bold text-slate-900">Personal information</h2><p className="mt-1 text-xs text-slate-400">Keep your contact details accurate.</p></div>{!editing && <button disabled={uploading} onClick={() => { setForm(formFor(account)); setEditing(true); }} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"><Pencil size={13} />Edit profile</button>}</div>
          {editing ? <form onSubmit={save}><div className="grid gap-4 sm:grid-cols-2">{fields.map(field => <label key={field.key} className="text-xs font-medium text-slate-600">{field.label}{!field.required && <span className="ml-1 font-normal text-slate-400">(optional)</span>}<input required={field.required} type={field.type} autoComplete={field.autoComplete} maxLength={field.key === 'address' ? 300 : 150} value={form[field.key]} onChange={event => setForm({ ...form, [field.key]: event.target.value })} disabled={saving||field.key==='email'} className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800" /></label>)}</div><div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={saving} onClick={() => { setForm(formFor(account)); setEditing(false); }} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100"><X size={13} />Cancel</button><button disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"><Check size={14} />{saving ? 'Saving…' : 'Save changes'}</button></div></form> : <dl className="grid gap-x-4 gap-y-5 sm:grid-cols-2">{fields.filter(field => Boolean(account[field.key])).map(field => <div key={field.key}><dt className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400"><field.icon size={13} />{field.label}</dt><dd className="break-words text-sm font-medium text-slate-700">{account[field.key]}</dd></div>)}{!account.address && <div><dt className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400"><MapPin size={13} />Address</dt><dd><button disabled={uploading} onClick={() => setEditing(true)} className="text-xs font-medium text-blue-600 hover:underline">Add address</button></dd></div>}</dl>}
        <VerifiedEmailChange/>
        </section>
      </div>
    </div>
  </div>;
}
