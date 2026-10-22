import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './booking-flow.css';
export default function BookingDialog({ title, eyebrow, description, busy, onClose, children }: { title: string; eyebrow: string; description: string; busy: boolean; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = dialog.current; const previous = document.activeElement; const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; node?.showModal(); return () => { node?.close(); document.body.style.overflow = overflow; if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); }; }, []);
  return <dialog ref={dialog} className="booking-dialog" aria-labelledby="booking-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}><header className="bf-header"><div><span>{eyebrow}</span><h2 id="booking-dialog-title">{title}</h2><p>{description}</p></div><button type="button" aria-label="Close booking" disabled={busy} onClick={onClose}><X size={19}/></button></header>{children}</dialog>;
}
