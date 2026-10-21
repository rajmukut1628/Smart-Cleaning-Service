import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowUpRight, BadgeCheck, X } from 'lucide-react';
import { Rating, ReviewIdentity, ReviewFooter } from './ReviewParts';
import { CustomerReview as Review, ReviewGalleryData } from './reviewTypes';
import ReviewGallery from './ReviewGallery';

function ReviewDetails({ review, onClose }: { review: Review; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const modal = dialog.current;
    const focus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modal?.showModal();
    return () => { modal?.close(); document.body.style.overflow = previousOverflow; if (focus instanceof HTMLElement && focus.isConnected) focus.focus(); };
  }, []);
  const aspects = [['Professionalism', review.professionalism], ['Punctuality', review.punctuality], ['Quality', review.quality]] as const;
  return <dialog ref={dialog} aria-label="Full customer review" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="service-image-dialog m-auto w-[94vw] max-w-3xl overflow-visible rounded-2xl border border-blue-100 bg-white p-0 shadow-2xl">
    <div className="overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b border-blue-100 bg-blue-50 px-5 py-3"><h2 className="text-sm font-bold text-blue-950">Customer experience</h2><button autoFocus aria-label="Close full review" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-blue-100"><X size={18} /></button></div>
      <div className="max-h-[75dvh] overflow-y-auto p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-4"><ReviewIdentity review={review} /><Rating value={review.rating} /></div><p className="my-5 whitespace-pre-line break-words text-[15px] leading-7 text-slate-700">{review.comment}</p>
        {aspects.some(([, value]) => value != null) && <div className="mb-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">{aspects.map(([label, value]) => value != null && <div key={label}><p className="mb-2 text-xs text-slate-500">{label}</p><Rating value={value} /></div>)}</div>}
        <div className="border-t border-slate-100 pt-4"><ReviewFooter review={review} /></div>
      </div>
    </div>
  </dialog>;
}

export default function ReviewSection({ standalone = false }: { standalone?: boolean }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  useEffect(() => {
    let active = true;
    axios.get<ReviewGalleryData>('/api/reviews/all', { params: { view: 'gallery', limit: 3 } }).then(({ data }) => { if (!Array.isArray(data.reviews)) throw new Error('Invalid review response'); if (active) { setReviews(data.reviews); setTotal(data.total); } }).catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <section id="testimonials" className="bg-white py-6 sm:py-7">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">{!standalone && <div><h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">What Our Customers Say<span className="text-blue-600">.</span></h2><p className="mt-1.5 text-sm text-slate-500">Experiences shared by customers after their cleaning service.</p></div>}{reviews.length > 0 && <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700"><BadgeCheck size={14} />{total} verified {total === 1 ? 'review' : 'reviews'}</span>}</div>
      {loading && <p role="status" className="py-8 text-sm text-slate-500">Loading customer reviews…</p>}
      {failed && <p role="alert" className="py-8 text-sm text-slate-500">Reviews are temporarily unavailable. Please try again later.</p>}
      {!loading && !failed && !reviews.length && <p className="py-8 text-sm text-slate-500">No customer reviews yet. Reviews will appear here after completed services.</p>}
      <div className={'grid gap-4 ' + (reviews.length === 3 ? 'lg:grid-cols-3' : reviews.length === 2 ? 'lg:grid-cols-2' : '')}>{reviews.map(review => <article key={review._id} className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/40 p-5 shadow-[0_6px_24px_-20px_#1e40af55] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><ReviewIdentity review={review} /><Rating value={review.rating} /></div>
        <p className="my-4 whitespace-pre-line break-words text-sm leading-6 text-slate-600">{review.comment}</p>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100/70 pt-3"><div className="min-w-[210px] flex-1"><ReviewFooter review={review} /></div>{(review.comment.length > 240 || review.professionalism != null || review.punctuality != null || review.quality != null) && <button onClick={() => setSelectedReview(review)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">View full review<ArrowUpRight size={14} /></button>}</div>
      </article>)}</div>
      {total > 3 && <div className="mt-5 flex justify-center"><button onClick={() => setGalleryOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">View more reviews <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{total}</span><ArrowUpRight size={16} /></button></div>}
    </div>
    {galleryOpen && <ReviewGallery onClose={() => setGalleryOpen(false)} />}
    {selectedReview && <ReviewDetails review={selectedReview} onClose={() => setSelectedReview(null)} />}
  </section>;
}

