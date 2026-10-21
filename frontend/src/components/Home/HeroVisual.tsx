import { ShieldCheckIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function HeroVisual() {
  return <div className="hero-visual">
    <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
    <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
    <div className="hero-photo-backplate" aria-hidden="true" />
    <div className="hero-photo-frame">
      <div className="hero-photo-inner">
        <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1100&auto=format&fit=crop" alt="Professional cleaner carefully cleaning a sunlit home" className="hero-photo" fetchPriority="high" />
        <div className="hero-photo-shade" aria-hidden="true" />
        <div className="absolute bottom-9 left-6 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.22em] text-white/90"><span className="h-px w-6 bg-blue-200" />Care in every detail</div>
      </div>
    </div>
    <div className="hero-sparkle-tag"><SparklesIcon className="h-4 w-4 text-blue-200" /><span>A little care. A fresh start.</span></div>
    <div className="hero-care-card">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600"><ShieldCheckIcon className="h-6 w-6" /></span>
      <div><p className="text-sm font-bold tracking-tight text-blue-950">Your space, thoughtfully cared for</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Book, track, and stay connected in one place.</p></div>
      <span className="hero-care-spark hidden sm:block" aria-hidden="true">✧</span>
    </div>
    <span className="hero-glint hero-glint-one" aria-hidden="true">✧</span>
    <span className="hero-glint hero-glint-two" aria-hidden="true">✦</span>
  </div>;
}
