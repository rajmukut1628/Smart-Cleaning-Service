import {useAuth} from '../../context/authState';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ArrowRight, Building2, Check, Clock3, Droplets, Plus, Sofa, Sparkles, ZoomIn } from 'lucide-react';
import ImageLightbox from '../common/ImageLightbox';
import { Service } from '../../types';
import { API_BASE_URL } from '../../config/apiConfig';
import BookingModal from './BookingModal';
import CustomServiceModal from './CustomServiceModal';

interface ServiceFromAPI extends Omit<Service, 'id'> { _id: string }

function ServiceArtwork({ service }: { service: Service }) {
  const [failed, setFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  useEffect(() => { setFailed(false); setPreviewOpen(false); }, [service.image]);
  const imageUrl = service.image?.startsWith('/') ? API_BASE_URL + service.image : service.image;
  const name = service.name.toLowerCase();
  const Icon = /sofa|couch/.test(name) ? Sofa : /water|tank/.test(name) ? Droplets : /office|commercial/.test(name) ? Building2 : Sparkles;
  return <div className="catalog-art relative h-32 xl:h-36 overflow-hidden bg-gradient-to-br from-blue-50 via-blue-100/70 to-slate-100">
    {service.image && !failed ? <button type="button" onClick={() => setPreviewOpen(true)} aria-label={`View full image of ${service.name}`} className="group/image relative flex h-full w-full cursor-zoom-in items-center justify-center bg-slate-50 p-2 focus-visible:outline-offset-[-3px]">
      <img src={imageUrl} alt={service.name} className="h-full w-full rounded-lg object-contain" onError={() => setFailed(true)} />
      <span className="absolute bottom-2 right-2 rounded-full border border-blue-100 bg-white/95 p-1.5 text-blue-600 opacity-0 shadow-sm transition-opacity group-hover/image:opacity-100 group-focus-visible/image:opacity-100" aria-hidden="true"><ZoomIn size={14} /></span>
    </button> : <div aria-label={service.name} role="img" className="absolute inset-0 flex items-center justify-center">
      <div className="absolute -right-8 -top-12 h-48 w-48 rounded-full border border-white/80" /><div className="absolute -left-10 -bottom-24 h-48 w-48 rounded-full border border-blue-200/60" />
      <div className="rounded-2xl border border-white bg-white/75 p-4 shadow-[0_8px_24px_-12px_#2563eb50]"><Icon className="h-10 w-10 text-blue-600" strokeWidth={1.4} /></div>
    </div>}
    {(!service.image || failed) && <span className="absolute left-3 top-3 max-w-[80%] truncate rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-800 backdrop-blur">{service.category.replace(/[-_]/g, ' ')}</span>}
    {previewOpen && <ImageLightbox src={imageUrl} alt={service.name} onClose={() => setPreviewOpen(false)} />}
  </div>;
}

export default function ServiceCatalog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showCustomServiceModal, setShowCustomServiceModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const fetchServices = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const { data: publicServices } = await axios.get<ServiceFromAPI[]>('/api/services');
      const customServices = user?.id && user.role === 'user' ? (await axios.get<ServiceFromAPI[]>('/api/services/custom')).data : [];
      setServices([...publicServices, ...customServices].map(({ _id, ...rest }) => ({ id: _id, ...rest })));
    } catch { setError('Unable to load services. Please try again.'); }
    finally { setIsLoading(false); }
  }, [user?.id, user?.role]);
  useEffect(() => { fetchServices(); }, [fetchServices]);
  const categories = ['all', ...Array.from(new Set(services.map(service => service.category).filter(Boolean)))];
  const filteredServices = services.filter(service => filter === 'all' || service.category === filter);
  const book = (service: Service) => { if (!user) { navigate('/login'); return; } if (user.role !== 'user') return; setSelectedService(service); };

  return <div className="catalog-page mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-blue-600" /><p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-600">Thoughtful care. Beautiful spaces.</p></div><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Find your perfect clean<span className="text-blue-600">.</span></h1><p className="mt-1 text-[13px] text-slate-500">Professional cleaning, clear pricing, and a time that suits you.</p></div>
      {user?.role === 'user' && <button onClick={() => setShowCustomServiceModal(true)} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"><Plus size={16} />Custom service</button>}
    </div>
    <div className="mb-4 flex items-center justify-between gap-4 border-b border-blue-100 pb-3">
      <nav aria-label="Service categories" className="flex gap-1.5 overflow-x-auto">{categories.map(category => <button key={category} aria-pressed={filter === category} onClick={() => setFilter(category)} className={'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ' + (filter === category ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'bg-white/70 text-slate-500 hover:bg-blue-100 hover:text-blue-700')}>
        {category === 'all' ? 'All services' : category.replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())}
      </button>)}</nav>
      {!isLoading && !error && <span className="hidden sm:block shrink-0 text-xs text-slate-400">{filteredServices.length} services available</span>}
    </div>
    {isLoading ? <div role="status" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(index => <div key={index} className="h-80 animate-pulse rounded-2xl border border-blue-100 bg-blue-100/40" />)}<span className="sr-only">Loading services…</span></div> : error ? <div role="alert" className="rounded-2xl border border-red-100 bg-white p-8 text-center"><p className="text-slate-600">{error}</p><button onClick={fetchServices} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">Try again</button></div> : filteredServices.length === 0 ? <p className="py-14 text-center text-slate-500">No services in this category yet.</p> : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {filteredServices.map(service => {
        const features = (service.features || []).flatMap(feature => feature.split(/\s*[*•\n|]\s*/)).map(feature => feature.trim()).filter(Boolean);
        const rate = service.pricePerSqFt > 0 ? `৳${service.pricePerSqFt}/sq ft` : service.pricePerUnit > 0 ? `৳${service.pricePerUnit}/unit` : null;
        return <article key={service.id} className="catalog-card group flex flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_6px_24px_-16px_#143c7c45] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_16px_32px_-16px_#143c7c55]">
          <ServiceArtwork service={service} />
          <div className="catalog-card-body flex flex-1 flex-col p-4">
            <div className="flex items-center justify-between gap-2"><h2 className="truncate text-lg font-bold text-slate-900" title={service.name}>{service.name}</h2><span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500"><Clock3 size={11} />{service.duration} hr</span></div>
            <p className="mt-1.5 line-clamp-2 min-h-[36px] text-xs leading-[18px] text-slate-500" title={service.description}>{service.description}</p>
            <div className="mt-3 min-h-[36px]" title={features.join(' · ')}><div className="flex flex-wrap gap-x-3 gap-y-1">{features.slice(0, 3).map((feature, index) => <span key={index} className="inline-flex max-w-full items-center gap-1 text-[10px] text-slate-600"><Check size={11} className="shrink-0 text-blue-500" /><span className="max-w-[180px] truncate">{feature}</span></span>)}{features.length > 3 && <span className="text-[10px] font-medium text-blue-600">+{features.length - 3} more</span>}</div></div>
            <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-100 pt-3"><div><p className="text-[10px] font-medium text-slate-400">Starting from</p><div className="flex items-baseline gap-2"><strong className="text-2xl font-bold tracking-tight text-blue-950">৳{service.basePrice.toLocaleString()}</strong>{rate && <span className="text-[10px] text-slate-400">+ {rate}</span>}</div></div>{(!user || user.role === 'user') && <button onClick={() => book(service)} className="inline-flex items-center gap-3 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700">Book now<ArrowRight size={14} /></button>}</div>
          </div>
        </article>;
      })}
    </div>}
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[10px] text-slate-400"><span className="inline-flex items-center gap-1.5"><Check size={12} className="text-blue-500" />Transparent pricing</span><span>Flexible scheduling</span><span>Pay cash after service</span></div>
    {selectedService && <BookingModal service={selectedService} onClose={() => setSelectedService(null)} />}
    {showCustomServiceModal && <CustomServiceModal onClose={() => setShowCustomServiceModal(false)} onServiceCreated={() => { setShowCustomServiceModal(false); fetchServices(); }} />}
  </div>;
}

