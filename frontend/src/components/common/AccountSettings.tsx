import { useEffect, useState } from 'react';
import axios from 'axios';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ChangePasswordModal from '../User/ChangePasswordModal';
import '../User/user-profile.css';
export default function AccountSettings() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [password, setPassword] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setProvider(null); setError(false);
    axios.get('/api/profile', { signal: controller.signal }).then(({ data }) => {
      if (data._id !== user?.id || data.role !== user?.role) throw new Error('Account mismatch');
      setProvider(data.authProvider || 'local');
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [user?.id, user?.role, retry]);
  if (!user || !['user', 'admin', 'superadmin'].includes(user.role)) return null;
  return <div className="customer-profile"><header className="cp-heading"><div><span className="cp-eyebrow">ACCOUNT PREFERENCES</span><h1>Settings<span>.</span></h1><p>Manage security for your {user.role === 'user' ? 'customer' : 'administrator'} account.</p></div><span className="cp-private"><ShieldCheck size={14}/> Account security</span></header>
    <section className="cp-panel cp-security"><div className="cp-security-icon"><KeyRound size={20}/></div><div><h2>Sign-in & password</h2>{error ? <p role="alert">Unable to load your security settings.</p> : provider === null ? <p role="status"><Loader2 size={15} className="inline animate-spin"/> Checking sign-in method…</p> : <><p>{provider === 'google' ? 'You use Google to sign in. Manage your password in your Google account.' : 'Use a unique password to protect your account.'}</p><span>{provider === 'google' ? 'Google sign-in' : 'Email & password'}</span></>}</div>{error ? <button className="cp-secondary" onClick={() => setRetry(n => n + 1)}>Try again</button> : provider && provider !== 'google' && <button className="cp-secondary" onClick={() => setPassword(true)}>Change password</button>}</section>
    {password && <ChangePasswordModal onClose={() => setPassword(false)}/>}
  </div>;
}
