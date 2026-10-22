import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, MailCheck, RotateCw } from 'lucide-react';
import AuthFrame from './AuthFrame';
interface Challenge { verificationId: string; email: string }
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0);
  const [done, setDone] = useState(false);
  const message = (err: unknown) => axios.isAxiosError(err) ? (axios.isAxiosError<{message:string}>(err)?err.response?.data.message:undefined) || 'Unable to connect. Please try again.' : 'Please try again.';
  useEffect(() => { if (!wait) return; const timer = window.setTimeout(() => setWait(value => Math.max(0, value - 1)), 1000);return () => window.clearTimeout(timer); }, [wait]);
  const requestCode = async (event?: React.FormEvent) => {
    event?.preventDefault();if (busy) return;setBusy(true);setError('');
    const address = (challenge?.email || email).trim().toLowerCase();
    try { const { data } = await axios.post('/api/auth/forgot-password', { email: address });setChallenge({ verificationId: data.verificationId, email: address });setCode('');setWait(data.retryAfter || 60); }
    catch (err) { setError(message(err));if (axios.isAxiosError(err) && err.response?.data?.retryAfter) setWait(err.response.data.retryAfter); }
    finally { setBusy(false); }
  };
  const reset = async (event: React.FormEvent) => {
    event.preventDefault();if (!challenge || busy) return;setError('');
    if (password !== confirmation) { setError('Your passwords do not match.');return; }
    setBusy(true);
    try { await axios.post('/api/auth/reset-password', { verificationId: challenge.verificationId, code, password, confirmPassword: confirmation });setPassword('');setConfirmation('');setCode('');setDone(true); }
    catch (err) { setError(message(err)); } finally { setBusy(false); }
  };
  if (done) return <AuthFrame><header className="auth-form-heading"><span>All set</span><h2>Password reset.</h2><p>Your account is ready for a fresh sign-in.</p></header><div className="auth-email-notice"><CheckCircle2 size={27}/><div><strong>Your password has been updated.</strong><span>Previous sessions have been signed out.</span></div></div><Link className="auth-submit" to="/login">Back to sign in <ArrowRight size={15}/></Link></AuthFrame>;
  return <AuthFrame register={!!challenge}><header className="auth-form-heading"><span>ACCOUNT RECOVERY</span><h2>{challenge ? 'Choose a new password.' : 'Forgot your password?'}</h2><p>{challenge ? 'Use your email code to securely reset your password.' : 'Enter your account email and we’ll help you recover access.'}</p></header>
    {challenge ? <><div className="auth-email-notice"><MailCheck size={24}/><div><strong>Check your inbox and Spam folder</strong><span>{challenge.email}</span></div></div><p className="auth-reset-note">If an eligible password account exists, a code will arrive shortly. The code expires in 10 minutes.</p><form className="auth-fields" onSubmit={reset}><label className="auth-field"><span>Six-digit reset code</span><input autoFocus required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" disabled={busy}/></label><div className="auth-reset-passwords"><label className="auth-field"><span>New password</span><input required type={show ? 'text' : 'password'} minLength={8} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" disabled={busy}/></label><label className="auth-field"><span>Confirm new password</span><input required type={show ? 'text' : 'password'} minLength={8} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="Re-enter your password" disabled={busy}/></label></div><label className="auth-reset-show"><input type="checkbox" checked={show} onChange={event => setShow(event.target.checked)}/> Show passwords</label>{error && <p role="alert" className="auth-error">{error}</p>}<button className="auth-submit" disabled={busy || code.length !== 6}>{busy ? 'Resetting…' : 'Reset password'}<ArrowRight size={15}/></button></form><div className="auth-code-actions"><button type="button" disabled={busy || wait > 0} onClick={() => void requestCode()}><RotateCw size={12}/>{wait ? 'Resend in ' + wait + 's' : 'Resend code'}</button><button type="button" disabled={busy} onClick={() => {setChallenge(null);setCode('');setPassword('');setConfirmation('');setError('');}}>Change email</button></div></> : <form className="auth-fields" onSubmit={requestCode}><label className="auth-field"><span>Email address</span><input autoFocus required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" disabled={busy}/></label>{error && <p role="alert" className="auth-error">{error}</p>}<button className="auth-submit" disabled={busy || wait > 0}>{busy ? 'Sending…' : wait ? 'Try again in ' + wait + 's' : 'Send reset code'}<ArrowRight size={15}/></button></form>}
    <p className="auth-google-hint">Signed up with Google? Continue with Google on the sign-in page.</p><p className="auth-switch"><Link to="/login"><ArrowLeft size={12} className="inline"/> Back to sign in</Link></p>
  </AuthFrame>;
}
