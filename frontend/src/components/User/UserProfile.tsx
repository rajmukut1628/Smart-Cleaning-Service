import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Camera, Check, Loader2, Mail, MapPin, Pencil, Phone, ShieldCheck, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { imageUrl } from '../../utils/imageUrl';
import './user-profile.css';

interface Profile {
  _id: string; name: string; email: string; phone?: string; address?: string;
  profilePicture?: string; role: string; authProvider?: string; emailVerifiedAt?: string; createdAt?: string;
}
const date = (value?: string) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not available';
const errorMessage = (error: unknown) => axios.isAxiosError(error) ? error.response?.data?.message || 'Unable to load your information. Please try again.' : 'Something went wrong. Please try again.';

export default function UserProfile() {
  const { user, updateUserProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [brokenPhoto, setBrokenPhoto] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (user?.role !== 'user') return;
    const controller = new AbortController();
    setLoading(true); setError(''); setProfile(null);
    axios.get<Profile>('/api/profile', { signal: controller.signal }).then(({ data }) => {
      if (data._id !== user.id || data.role !== 'user') throw new Error('Profile does not match your account.');
      setProfile(data); setForm({ name: data.name, phone: data.phone || '', address: data.address || '' });
    }).catch(err => { if (!controller.signal.aborted) setError(errorMessage(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.id, user?.role, retry]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!form.name.trim()) { toast.error('Enter your full name.'); return; } setSaving(true);
    try {
      const { data } = await axios.put('/api/profile', { name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() });
      setProfile(data.user); updateUserProfile({ name: data.user.name, phone: data.user.phone, address: data.user.address });
      setEditing(false); toast.success('Your profile has been updated.');
    } catch (err) { toast.error(errorMessage(err)); } finally { setSaving(false); }
  };
  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { toast.error('Choose a JPG, PNG or WebP image up to 5 MB.'); return; }
    const payload = new FormData(); payload.append('profilePicture', file); setUploading(true);
    try {
      const { data } = await axios.put('/api/profile/picture', payload);
      setProfile(data.user); setBrokenPhoto(false); updateUserProfile({ avatar: imageUrl(data.user.profilePicture) }); toast.success('Profile photo updated.');
    } catch (err) { toast.error(errorMessage(err)); } finally { setUploading(false); }
  };
  if (user?.role !== 'user') return null;
  if (loading) return <div className="customer-profile cp-loading" role="status"><Loader2 className="animate-spin" size={22}/> Loading your profile…</div>;
  if (error || !profile) return <div className="customer-profile cp-panel cp-empty" role="alert"><h2>We couldn’t load your profile.</h2><p>{error}</p><button className="cp-primary" onClick={() => setRetry(n => n + 1)}>Try again</button></div>;
  const initials = profile.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  return <div className="customer-profile">
    <header className="cp-heading"><div><span className="cp-eyebrow">YOUR PERSONAL SPACE</span><h1>My profile<span>.</span></h1><p>Your personal details, ready for your next cleaning booking.</p></div><span className="cp-private"><ShieldCheck size={14}/> Personal account</span></header>
    <div className="cp-layout">
      <aside className="cp-panel cp-identity"><div className="cp-cover"><span/><span/></div><div className="cp-identity-body"><div className="cp-avatar"><span>{initials}</span>{profile.profilePicture && !brokenPhoto && <img src={imageUrl(profile.profilePicture)} alt={profile.name} onError={() => setBrokenPhoto(true)}/>}<label className="cp-camera" title="Change profile photo">{uploading ? <Loader2 size={15} className="animate-spin"/> : <Camera size={15}/>}<input aria-label="Change profile photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || saving} onChange={e => { void uploadPhoto(e.target.files?.[0]); e.target.value = ''; }}/></label></div><h2>{profile.name}</h2><p className="cp-email">{profile.email}</p><span className="cp-badge"><UserRound size={12}/> Customer</span><div className="cp-member"><span>Member since</span><strong>{date(profile.createdAt)}</strong></div><p className="cp-photo-note" role="status">{uploading ? 'Uploading your photo…' : 'JPG, PNG or WebP · Up to 5 MB'}</p></div></aside>
      <div className="cp-main"><section className="cp-panel"><div className="cp-panel-head"><div><h2>Personal information</h2><p>Contact details for your cleaning bookings.</p></div>{!editing && <button className="cp-secondary" onClick={() => { setForm({ name: profile.name, phone: profile.phone || '', address: profile.address || '' }); setEditing(true); }}><Pencil size={14}/> Edit details</button>}</div>
        {editing ? <form onSubmit={save} className="cp-form"><fieldset disabled={saving || uploading}><label>Full name<input autoFocus required maxLength={100} autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><label>Phone number<input type="tel" maxLength={30} autoComplete="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Add a contact number"/></label><label className="cp-wide">Service address<textarea rows={2} maxLength={500} autoComplete="street-address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="House, road, area and city"/></label></fieldset><div className="cp-form-actions"><button className="cp-primary" disabled={saving || uploading}><Check size={15}/>{saving ? 'Saving…' : 'Save changes'}</button><button type="button" className="cp-secondary" disabled={saving} onClick={() => setEditing(false)}><X size={14}/> Cancel</button></div></form>
        : <dl className="cp-details">{[{ label: 'Full name', value: profile.name, icon: UserRound }, { label: 'Email address', value: profile.email, icon: Mail }, { label: 'Phone number', value: profile.phone || 'Not added yet', icon: Phone }, { label: 'Service address', value: profile.address || 'Add an address for easier booking', icon: MapPin }].map(item => <div key={item.label}><item.icon size={17}/><div><dt>{item.label}</dt><dd>{item.value}</dd></div></div>)}</dl>}
      </section><Link to="/user-dashboard" className="cp-dashboard-link"><span>Looking for an upcoming booking? <strong>Open your dashboard</strong></span><ArrowUpRight size={18}/></Link></div>
    </div>
  </div>;
}
