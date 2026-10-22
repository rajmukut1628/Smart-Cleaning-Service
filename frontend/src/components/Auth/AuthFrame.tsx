import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, ShieldCheck, Sparkles } from 'lucide-react';
import './auth.css';

export default function AuthFrame({ children, register = false }: { children: ReactNode; register?: boolean }) {
  return <main className={`auth-page ${register ? 'auth-page-register' : ''}`}>
    <div className="auth-layout">
      <aside className="auth-story">
        <Link to="/" className="auth-brand"><span><Sparkles size={23} /></span><div>Smart Cleaning Service<small>Thoughtful care. Beautiful spaces.</small></div></Link>
        <div className="auth-story-copy"><span className="auth-eyebrow"><span /> A little care. A fresh start.</span><h1>A cleaner space.<br /><em>A brighter day.</em></h1><p>Good care starts with a simple connection. Your next clean, all in one place.</p><div className="auth-benefits">{['Book a service that fits your space', 'Choose a time that suits your day', 'Keep your bookings and team close'].map(text => <div key={text}><span><Check size={13} /></span>{text}</div>)}</div></div>
        <div className="auth-story-footer"><ShieldCheck size={18} /><span>Your space, thoughtfully cared for.</span><Sparkles size={18} /></div>
        <div className="auth-orbit auth-orbit-one" aria-hidden="true" /><div className="auth-orbit auth-orbit-two" aria-hidden="true" />
      </aside>
      <section className="auth-form-panel"><Link to="/" className="auth-back"><ArrowLeft size={14} /> Back to home</Link>{children}</section>
    </div>
  </main>;
}
