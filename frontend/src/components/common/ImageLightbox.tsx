import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ImageLightboxProps { src: string; alt: string; onClose: () => void }

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const modal = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modal?.showModal();
    return () => {
      modal?.close(); document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);
  return <dialog ref={dialog} aria-label={`${alt} — full image`} className="service-image-dialog m-auto w-[96vw] max-w-5xl overflow-visible rounded-2xl border border-white/20 bg-white p-0 shadow-2xl" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3"><div><p className="text-[10px] font-semibold uppercase tracking-widest text-blue-600">Service gallery</p><h2 className="mt-0.5 text-sm font-semibold text-slate-900">{alt}</h2></div><button type="button" autoFocus onClick={onClose} aria-label="Close image preview" className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-blue-100 hover:text-blue-700"><X size={20} /></button></div>
      <div className="flex items-center justify-center bg-slate-50 p-3 sm:p-4"><img src={src} alt={alt} className="max-h-[calc(90dvh-100px)] w-full object-contain" /></div>
      <p className="border-t border-slate-100 bg-white px-5 py-2 text-center text-[11px] text-slate-400">Full image · Press Esc or click outside to close</p>
    </div>
  </dialog>;
}
