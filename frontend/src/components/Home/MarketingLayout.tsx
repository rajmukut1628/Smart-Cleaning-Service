import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Sparkles } from 'lucide-react';
export function MarketingFooter() {
  return <footer className="marketing-footer"><div className="marketing-container flex flex-wrap items-center justify-between gap-4"><Link to="/" className="flex items-center gap-2 text-sm font-bold text-blue-950"><Sparkles size={18} className="text-blue-600"/>Smart Cleaning Service</Link><nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500"><Link to="/services">Services</Link><Link to="/how-it-works">How it works</Link><Link to="/reviews">Reviews</Link><Link to="/contact">Contact</Link></nav><p className="text-[10px] text-slate-400">© {new Date().getFullYear()} Smart Cleaning Service</p></div></footer>;
}
export function MarketingPage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <div className="marketing-page"><div className="marketing-container marketing-content"><div className="marketing-page-heading"><Link to="/" className="marketing-back">Home <ArrowUpRight size={12}/></Link><p className="marketing-eyebrow">{eyebrow}</p><h1>{title}<span className="text-blue-600">.</span></h1><p>{description}</p></div>{children}</div><MarketingFooter/></div>;
}

