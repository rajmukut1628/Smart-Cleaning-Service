import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { BadgeCheck, ChevronLeft, ChevronRight, MessageSquareQuote, Star, X } from 'lucide-react';
import { Rating, ReviewIdentity, ReviewFooter } from './ReviewParts';
import { ReviewGalleryData } from './reviewTypes';

export default function ReviewGallery({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ReviewGalleryData | null>(null);
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState(0);
  const [sort, setSort] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const modal = dialog.current;
    const focus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; modal?.showModal();
    return () => { modal?.close(); document.body.style.overflow = overflow; if (focus instanceof HTMLElement && focus.isConnected) focus.focus(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setFailed(false);
    axios.get<ReviewGalleryData>('/api/reviews/all', { params: { view: 'gallery', page, limit: 6, rating, sort }, signal: controller.signal })
      .then(response => { if (!Array.isArray(response.data.reviews)) throw new Error('Invalid review response'); if (!controller.signal.aborted) { setData(response.data); content.current?.scrollTo({ top: 0 }); } })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, rating, sort, retry]);

  return <dialog ref={dialog} aria-label="All customer reviews" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="service-image-dialog m-auto h-[88dvh] max-h-[820px] w-[95vw] max-w-5xl overflow-visible rounded-3xl border border-blue-100 bg-white p-0 shadow-2xl">
    <div className="flex h-full flex-col overflow-hidden rounded-3xl">
      <header className="!static flex shrink-0 items-center justify-between gap-4 border-b border-blue-100 bg-gradient-to-r from-blue-950 to-blue-800 px-5 py-4 text-white sm:px-7"><div className="flex items-center gap-3"><span className="rounded-xl border border-white/15 bg-white/10 p-2.5"><MessageSquareQuote size={22} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-blue-200">The customer experience</p><h2 className="mt-1 text-xl font-bold">Reviews & stories</h2></div></div><button autoFocus aria-label="Close all reviews" onClick={onClose} className="rounded-full bg-white/10 p-2 text-blue-100 hover:bg-white/20"><X size={20} /></button></header>
      <div ref={content} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/70 p-5 sm:p-7" aria-busy={loading}>
        {data && <div className="mb-5 grid gap-5 rounded-2xl border border-blue-100 bg-white p-5 sm:grid-cols-[1fr_1.1fr]"><div className="flex items-center gap-5"><div><p className="text-4xl font-bold tracking-tight text-blue-950">{data.averageRating.toFixed(1)}<span className="ml-1 text-base font-medium text-slate-400">/5</span></p><div className="mt-2"><Rating value={data.averageRating} /></div></div><div className="border-l border-slate-100 pl-5"><p className="font-semibold text-slate-800">{data.total} customer {data.total === 1 ? 'review' : 'reviews'}</p><p className="mt-1 flex items-center gap-1 text-xs text-blue-600"><BadgeCheck size={13} />From verified bookings</p></div></div><div className="space-y-1.5">{[5,4,3,2,1].map(stars => <div className="flex items-center gap-2 text-[10px] text-slate-500" key={stars}><span className="w-2">{stars}</span><Star size={10} className="fill-amber-400 text-amber-400" /><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${data.total ? (data.distribution[stars] || 0) / data.total * 100 : 0}%` }} /></div><span className="w-5 text-right">{data.distribution[stars] || 0}</span></div>)}</div></div>}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><nav aria-label="Filter reviews by rating" className="flex flex-wrap gap-1.5">{[0,5,4,3,2,1].map(stars => <button key={stars} aria-pressed={rating === stars} onClick={() => { setRating(stars); setPage(1); }} className={'rounded-lg border px-3 py-1.5 text-xs font-medium ' + (rating === stars ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300')}>{stars ? `${stars} stars` : 'All ratings'}</button>)}</nav><label className="flex items-center gap-2 text-xs text-slate-500">Sort<select value={sort} onChange={event => { setSort(event.target.value); setPage(1); }} className="border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"><option value="latest">Newest first</option><option value="highest">Highest rated</option><option value="lowest">Lowest rated</option></select></label></div>
        {loading ? <div role="status" className="grid gap-4 sm:grid-cols-2">{[0,1].map(index => <div key={index} className="h-44 animate-pulse rounded-2xl border border-blue-100 bg-blue-50" />)}<span className="sr-only">Loading reviews…</span></div> : failed ? <div role="alert" className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><p className="text-sm text-slate-500">Could not load reviews.</p><button onClick={() => setRetry(value => value + 1)} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">Try again</button></div> : data && !data.reviews.length ? <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No reviews match this rating yet.</p> : <div className="grid items-start gap-4 md:grid-cols-2">{data?.reviews.map(review => <article key={review._id} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"><div className="mb-3"><ReviewIdentity review={review} /></div><Rating value={review.rating} /><p className="my-4 whitespace-pre-line break-words text-sm leading-6 text-slate-600">{review.comment}</p>{(review.professionalism != null || review.punctuality != null || review.quality != null) && <details className="mb-4 text-xs text-slate-500"><summary className="cursor-pointer font-medium text-blue-600">Detailed ratings</summary><div className="mt-3 space-y-2">{[['Professionalism',review.professionalism],['Punctuality',review.punctuality],['Quality',review.quality]].map(([label,value]) => typeof value === 'number' && <div className="flex justify-between gap-3" key={String(label)}><span>{label}</span><Rating value={value} /></div>)}</div></details>}<div className="border-t border-slate-100 pt-3"><ReviewFooter review={review} /></div></article>)}</div>}
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-blue-100 bg-white px-5 py-3 text-xs sm:px-7"><p aria-live="polite" className="text-slate-400">{loading ? 'Loading reviews…' : failed ? 'Please try again' : `${data?.filteredTotal || 0} reviews · Page ${page} of ${data?.pages || 1}`}</p><div className="flex gap-2"><button disabled={loading || failed || page <= 1} onClick={() => setPage(value => value - 1)} className="inline-flex items-center gap-1 rounded-lg border border-blue-100 px-3 py-2 font-medium text-blue-700 hover:bg-blue-50"><ChevronLeft size={14} />Previous</button><button disabled={loading || failed || !data || page >= data.pages} onClick={() => setPage(value => value + 1)} className="inline-flex items-center gap-1 rounded-lg border border-blue-100 px-3 py-2 font-medium text-blue-700 hover:bg-blue-50">Next<ChevronRight size={14} /></button></div></footer>
    </div>
  </dialog>;
}
