import { useEffect, useRef, useState } from 'react';

type GoogleCredentialResponse = { credential: string };
type GoogleIdentityApi = {
  initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
  renderButton: (element: HTMLElement, options: { theme: 'outline'; size: 'large'; shape: 'pill'; text: 'continue_with' | 'signup_with'; logo_alignment: 'left'; width: number }) => void;
};
declare global { interface Window { google?: { accounts?: { id?: GoogleIdentityApi } } } }

interface GoogleIdentityButtonProps {
  mode: 'login' | 'register';
  onCredential: (credential: string) => Promise<unknown> | unknown;
}

export default function GoogleIdentityButton({ mode, onCredential }: GoogleIdentityButtonProps) {
  const holder = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const [issue, setIssue] = useState('');
  const [working, setWorking] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

  useEffect(() => { callback.current = onCredential; }, [onCredential]);
  useEffect(() => {
    if (!clientId || !holder.current) return;
    let stopped = false;
    let retryTimer: number | undefined;
    const setup = () => {
      if (stopped || !holder.current) return;
      const google = window.google?.accounts?.id;
      if (!google) { retryTimer = window.setTimeout(setup, 100); return; }
      google.initialize({ client_id: clientId, callback: response => {
        if (!response.credential) { setIssue('Google did not return a valid account. Please try again.'); return; }
        setWorking(true);
        setIssue('');
        Promise.resolve(callback.current(response.credential)).catch(error => {
          setIssue(error?.response?.data?.message || (error instanceof Error ? error.message : 'Google sign-in failed. Please try again.'));
        }).finally(() => setWorking(false));
      } });
      holder.current.replaceChildren();
      google.renderButton(holder.current, { theme: 'outline', size: 'large', shape: 'pill', text: mode === 'login' ? 'continue_with' : 'signup_with', logo_alignment: 'left', width: Math.min(holder.current.clientWidth || 340, 360) });
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
    if (!window.google?.accounts?.id && !existing) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = 'true';
      script.onload = setup;
      script.onerror = () => setIssue('Google sign-in could not load. Check your connection and retry.');
      document.head.appendChild(script);
    } else setup();
    return () => { stopped = true; if (retryTimer) window.clearTimeout(retryTimer); };
  }, [clientId, mode]);

  if (!clientId) return <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-center text-xs leading-relaxed text-blue-800">Google sign-in will appear after the frontend Google Client ID is configured.</div>;
  return <div className="space-y-2"><div ref={holder} className={`flex min-h-10 justify-center transition-opacity ${working ? 'pointer-events-none opacity-60' : ''}`} aria-label={mode === 'login' ? 'Continue with Google' : 'Sign up with Google'} />{issue && <p role="alert" className="text-center text-xs text-red-600">{issue}</p>}</div>;
}
