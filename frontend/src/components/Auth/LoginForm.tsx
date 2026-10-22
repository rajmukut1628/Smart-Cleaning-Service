import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import GoogleIdentityButton from './GoogleIdentityButton';
import AuthFrame from './AuthFrame';
import { ArrowRight } from 'lucide-react';

interface LoginFormProps {
  onSwitchPage: () => void;
}

export default function LoginForm({ onSwitchPage }: LoginFormProps) {
  const { login, loginWithGoogle, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      toast.success('Successfully logged in!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Invalid credentials. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage, {
        duration: 4000,
        icon: '⚠️',
      });
    }
  };

  return <AuthFrame>
    <header className="auth-form-heading"><span>Welcome back</span><h2>Sign in to your space.</h2><p>Your bookings, your team. All in one place.</p></header>
    <form className="auth-fields" onSubmit={handleSubmit}>
      <label className="auth-field" htmlFor="email"><span>Email address</span><input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
      <label className="auth-field" htmlFor="password"><span>Password</span><div className="auth-password"><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeSlashIcon /> : <EyeIcon />}</button></div></label>
      <Link className="auth-forgot-link" to="/forgot-password">Forgot password?</Link>
      {error && <div role="alert" className="auth-error">{error}</div>}
      <button type="submit" disabled={isLoading} className="auth-submit">{isLoading ? 'Signing in...' : 'Sign in'}<ArrowRight size={15} /></button>
    </form>
    <p className="auth-switch">Don't have an account?<button type="button" onClick={onSwitchPage}>Sign up</button></p>
    <div className="auth-divider">or continue with Google</div>
    <div className="auth-google-zone"><GoogleIdentityButton mode="login" onCredential={loginWithGoogle} /><p className="auth-google-hint">A simple, secure way to connect your Gmail account.</p></div>
  </AuthFrame>;
}
