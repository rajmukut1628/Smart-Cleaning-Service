import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {useAuth} from '../../context/authState';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import GoogleIdentityButton from './GoogleIdentityButton';
import AuthFrame from './AuthFrame';
import { ArrowRight, MailCheck, RotateCw } from 'lucide-react';

interface RegistrationFormProps {
  onSwitchPage: () => void;
}

export default function RegistrationForm({ onSwitchPage }: RegistrationFormProps) {
  const { register, verifyRegistration } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pending, setPending] = useState<{ verificationId: string; email: string } | null>(null);
  const [code, setCode] = useState('');
  const [resendWait, setResendWait] = useState(0);
  const messageFor = (error: unknown) => axios.isAxiosError(error) ? (axios.isAxiosError<{message:string}>(error)?error.response?.data.message:undefined) || 'Please try again.' : error instanceof Error ? error.message : 'Please try again.';
  useEffect(() => { if (resendWait <= 0) return; const timer = window.setTimeout(() => setResendWait(value => Math.max(0, value - 1)), 1000); return () => window.clearTimeout(timer); }, [resendWait]);

  const signUpWithGoogle = async (credential: string) => {
    await axios.post('/api/auth/google/register', { credential });
    toast.success('Google account registered. Please sign in with Continue with Google.');
    onSwitchPage();
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true); setError('');
    try {
      const result = await register(name, email, password, phone);
      setPending({ verificationId: result.verificationId, email: result.email }); setResendWait(result.retryAfter || 60); setPassword('');
      toast.success('Verification code sent. Please check your email.');
    } catch (error) { const text = messageFor(error); setError(text); toast.error(text); }
    finally { setIsLoading(false); }
  };
  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault(); if (!pending) return; setIsLoading(true); setError('');
    try { await verifyRegistration(pending.verificationId, code); toast.success('email verified. You are now signed in.'); }
    catch (error) { setError(messageFor(error)); }
    finally { setIsLoading(false); }
  };
  const resendCode = async () => {
    if (!pending || resendWait > 0) return; setIsLoading(true); setError('');
    try { const { data } = await axios.post('/api/auth/register/resend', { verificationId: pending.verificationId }); setResendWait(data.retryAfter || 60); setCode(''); toast.success('A new verification code was sent.'); }
    catch (error) { setError(messageFor(error)); if (axios.isAxiosError(error) && error.response?.data?.retryAfter) setResendWait(error.response.data.retryAfter); }
    finally { setIsLoading(false); }
  };
  if (pending) return <AuthFrame register><header className="auth-form-heading"><span>Check your inbox</span><h2>Verify your email.</h2><p>One last step before your account is ready.</p></header><div className="auth-email-notice"><MailCheck size={24}/><div><strong>We sent a verification code to</strong><span>{pending.email}</span></div></div><form className="auth-fields" onSubmit={verifyCode}><label className="auth-field auth-code-field" htmlFor="verification-code"><span>Six-digit verification code</span><input autoFocus id="verification-code" name="verificationCode" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" aria-describedby="verification-expiry" /></label><p id="verification-expiry" className="auth-code-help">Your code expires in 10 minutes. Check Spam if it hasn't arrived.</p>{error && <div role="alert" className="auth-error">{error}</div>}<button className="auth-submit" type="submit" disabled={isLoading || code.length !== 6}>{isLoading ? 'Please wait...' : 'Verify & sign in'}<ArrowRight size={15}/></button></form><div className="auth-code-actions"><button type="button" onClick={resendCode} disabled={isLoading || resendWait > 0}><RotateCw size={12}/>{resendWait > 0 ? 'Resend in ' + resendWait + 's' : 'Resend code'}</button><button type="button" disabled={isLoading} onClick={() => { setPending(null); setCode(''); setError(''); }}>Change details</button></div><p className="auth-google-hint">Verification signs you in automatically. Next time, use your email and chosen password.</p><p className="auth-switch">Already verified?<button type="button" onClick={onSwitchPage}>Sign in</button></p></AuthFrame>;

  return <AuthFrame register>
    <header className="auth-form-heading"><span>A fresh start</span><h2>Create your account.</h2><p>A little less effort. A beautifully cared-for space.</p></header>
    <form className="auth-fields" onSubmit={handleSubmit}>
      <div className="auth-two-col">
        <label className="auth-field" htmlFor="name"><span>Full name</span><input id="name" name="name" type="text" autoComplete="name" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></label>
        <label className="auth-field" htmlFor="phone"><span>Phone number</span><input id="phone" name="phone" type="tel" autoComplete="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" /></label>
      </div>
      <label className="auth-field" htmlFor="email"><span>email address</span><input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
      <label className="auth-field" htmlFor="password"><span>Password</span><div className="auth-password"><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeSlashIcon /> : <EyeIcon />}</button></div></label>
      {error && <div role="alert" className="auth-error">{error}</div>}
      <button type="submit" disabled={isLoading} className="auth-submit">{isLoading ? 'Creating account...' : 'Sign up'}<ArrowRight size={15} /></button>
    </form>
    <p className="auth-switch">Already have an account?<button type="button" onClick={onSwitchPage}>Sign in</button></p>
    <div className="auth-divider">or sign up with Google</div>
    <div className="auth-google-zone"><GoogleIdentityButton mode="register" onCredential={signUpWithGoogle} /><p className="auth-google-hint">Google sign-up creates a Google-only account. No password needed.</p></div>
  </AuthFrame>;
}
