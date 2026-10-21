import { useState } from 'react';
import { Star, BadgeCheck } from 'lucide-react';
import { API_BASE_URL } from '../../config/apiConfig';
import { CustomerReview as Review } from './reviewTypes';

export function Rating({ value }: { value: number }) {
  return <div className="flex items-center gap-1" aria-label={`${value} out of 5 stars`}><span className="flex gap-0.5" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} className={index < value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />)}</span><span className="ml-1 text-xs font-semibold text-slate-700">{value.toFixed(1)}</span></div>;
}

export function ReviewIdentity({ review }: { review: Review }) {
  const [failed, setFailed] = useState(false);
  const picture = review.user?.profilePicture;
  return <div className="flex min-w-0 items-center gap-3">
    {picture && !failed ? <img src={picture.startsWith('/') ? API_BASE_URL + picture : picture} onError={() => setFailed(true)} alt={review.user?.name} className="h-10 w-10 shrink-0 rounded-full border border-blue-100 object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 font-semibold text-blue-600">{review.user?.name.charAt(0).toUpperCase()}</span>}
    <div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-900">{review.user?.name}</h3><p className="mt-0.5 text-xs font-medium text-blue-600">{review.service?.name}</p></div>
  </div>;
}

export function ReviewFooter({ review }: { review: Review }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]"><time dateTime={review.createdAt} className="text-slate-400">{new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</time><span className="inline-flex items-center gap-1 text-blue-600"><BadgeCheck size={14} />Verified booking</span></div>;
}

