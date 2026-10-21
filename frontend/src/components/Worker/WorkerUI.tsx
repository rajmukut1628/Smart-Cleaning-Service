import { ReactNode, useEffect, useRef } from 'react';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
export function WorkerHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <header className="worker-heading"><div><p className="worker-eyebrow">{eyebrow}</p><h1>{title}<span className="text-blue-600">.</span></h1><p className="text-sm text-slate-500">{description}</p></div><div className="flex flex-wrap items-center gap-2">{children}</div></header>;
}
export function RefreshButton({ onClick, loading }: { onClick: () => void; loading: boolean }) { return <button className="worker-icon-button" aria-label="Refresh data" onClick={onClick} disabled={loading}><ArrowPathIcon className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} /></button>; }
export function DataState({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (error) return <div role="alert" className="worker-panel p-5 text-sm text-red-600">{error}<button className="ml-3 underline" onClick={retry}>Try again</button></div>;
  return loading ? <div role="status" className="worker-panel p-5 text-sm text-slate-500">Loading your workspace…</div> : null;
}
export function WorkerModal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; const active = document.activeElement; dialog?.showModal(); return () => { dialog?.close(); if (active instanceof HTMLElement) active.focus(); }; }, []);
  return <dialog ref={ref} className="worker-modal" aria-labelledby="worker-modal-title" onCancel={onClose} onClick={event => { if (event.target === ref.current) onClose(); }}><div className="flex items-center justify-between border-b border-slate-100 px-5 py-3"><h2 id="worker-modal-title" className="font-bold">{title}</h2><button className="worker-icon-button" aria-label="Close dialog" onClick={onClose}><XMarkIcon className="h-4 w-4" /></button></div><div className="p-5">{children}</div></dialog>;
}
