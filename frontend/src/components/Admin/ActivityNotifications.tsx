import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { BellIcon } from '@heroicons/react/24/outline';
import RecentActivity from './RecentActivity';
export default function ActivityNotifications({userId}:{userId:string}) {
 const storageKey='cleaning-notifications-seen:'+userId;
 const [open,setOpen]=useState(false),[latest,setLatest]=useState(0),[seen,setSeen]=useState(()=>{try{return Number(localStorage.getItem(storageKey))||0;}catch{return 0;}});
 useEffect(()=>{const controller=new AbortController();const refresh=()=>{if(document.visibilityState==='hidden')return;axios.get<{items:{timestamp:string}[]}>('/api/admin/activity-logs',{params:{page:1},signal:controller.signal}).then(({data})=>{const timestamps=data.items.map(item=>Date.parse(item.timestamp)).filter(Number.isFinite);setLatest(timestamps.length?Math.max(...timestamps):0);}).catch(()=>{});};refresh();const timer=setInterval(refresh,30000);return()=>{controller.abort();clearInterval(timer);};},[userId]);
 useEffect(()=>{if(open&&latest>seen){setSeen(latest);try{localStorage.setItem(storageKey,String(latest));}catch{/* Read state is optional when storage is unavailable. */}}},[open,latest,seen,storageKey]);
 const unread=latest>seen;
 return <><button onClick={()=>setOpen(true)} aria-label={unread?'Notifications, new activity':'Notifications'} aria-haspopup="dialog" className="relative rounded-xl p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"><BellIcon className="h-5 w-5"/>{unread&&<span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white"/>}</button>{open&&<NotificationPanel close={()=>setOpen(false)}/>}</>;
}
function NotificationPanel({close}:{close:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const focus=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.showModal();return()=>{document.body.style.overflow=overflow;focus?.focus();};},[]);
 return <dialog ref={dialog} aria-label="Notifications" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===dialog.current)close();}} className="m-auto max-h-[88dvh] w-[calc(100%_-_24px)] max-w-4xl overflow-y-auto overscroll-contain rounded-2xl border-0 bg-white p-0 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm"><RecentActivity onClose={close}/></dialog>;
}
