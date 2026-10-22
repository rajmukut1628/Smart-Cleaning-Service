interface WorkplaceBooking {status:string;paymentStatus?:string;worker?:unknown;workers?:unknown[]}
export function workplaceStatus(booking:WorkplaceBooking){
 if(booking.status==='cancelled')return {key:'cancelled',label:'Cancelled',note:'Booking cancelled',tone:'bg-slate-100 text-slate-500'};
 if(booking.status==='completed')return booking.paymentStatus==='paid'?{key:'fully-completed',label:'Fully completed',note:'Paid · cash confirmed',tone:'bg-emerald-50 text-emerald-700'}:{key:'cash-pending',label:'Work completed',note:'Cash confirmation pending',tone:'bg-amber-50 text-amber-700'};
 if(booking.status==='in-progress')return {key:'in-progress',label:'In progress',note:'Cleaning in progress',tone:'bg-indigo-50 text-indigo-700'};
 if(booking.worker||booking.workers?.some(Boolean))return {key:'assigned',label:'Assigned',note:'Work has not started',tone:'bg-blue-50 text-blue-700'};
 return {key:'unassigned',label:'Awaiting assignment',note:'Choose a cleaning team',tone:'bg-amber-50 text-amber-700'};
}
