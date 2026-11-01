import {useCallback,useEffect,useState} from 'react';
import axios from 'axios';
import BookingDetailsModal from './BookingDetailsModal';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { ToolbarProps, EventProps, View } from 'react-big-calendar';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup the localizer by providing the moment Object
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Booking {
  _id: string;
  service: { name: string; duration?: number };
  user: { name: string; email: string };
 address: string; workers: { _id: string; name: string }[]; totalAmount: number; createdAt: string;
  scheduledDate: string;
  scheduledTime: string; // e.g., "10:00"
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
}

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: Booking;
  status?: string; // Add status for color coding
}

const statuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];
const calendarViews: { value: View; label: string }[] = [
  { value: 'month', label: 'Month' }, { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' }, { value: 'agenda', label: 'Agenda' },
];
function CalendarToolbar({ label, view, onNavigate, onView }: ToolbarProps<CalendarEvent>) {
  return <div className="booking-calendar-toolbar"><div className="booking-calendar-navigation"><div className="booking-calendar-arrows"><button type="button" aria-label="Previous period" onClick={() => onNavigate('PREV')}><ChevronLeft size={17}/></button><button type="button" aria-label="Next period" onClick={() => onNavigate('NEXT')}><ChevronRight size={17}/></button></div><button type="button" className="booking-calendar-today" onClick={() => onNavigate('TODAY')}>Today</button><h4 aria-live="polite">{label}</h4></div><div className="booking-calendar-views" role="group" aria-label="Calendar view">{calendarViews.map(item => <button key={item.value} type="button" aria-pressed={view === item.value} className={view === item.value ? 'active' : ''} onClick={() => onView(item.value)}>{item.label}</button>)}</div></div>;
}
function BookingEvent({ event }: EventProps<CalendarEvent>) {
  return <div className="booking-calendar-event"><div><strong>{event.resource?.service.name || event.title}</strong><time>{format(event.start, 'HH:mm')}</time></div><span>{event.resource?.user.name}</span></div>;
}

const BookingCalendar = ({bookings,onSelectBooking}: {bookings: Booking[];onSelectBooking: (booking: Booking)=>void}) => {
  const transformBookingsToEvents = (bookings: Booking[]): CalendarEvent[] => {
    return bookings
      .filter(booking => booking && booking.user && booking.service) // Ensure booking, user, and service are not null
      .map(booking => {
        const [hour, minute] = booking.scheduledTime.split(':').map(Number);
        const startDate = new Date(booking.scheduledDate);
        startDate.setHours(hour, minute);

        // Assume a 2-hour duration for each booking for now
        const endDate = new Date(startDate.getTime() + (booking.service.duration || 2) * 60 * 60 * 1000);

        return {
          title: `${booking.service.name} - ${booking.user.name}`,
          start: startDate,
          end: endDate,
          resource: booking, // Keep original booking info
          status: booking.status, // Add status for color coding
        };
      });
  };

  const eventStyleGetter = (event: CalendarEvent) => ({
    className: 'booking-event-' + (event.status || 'confirmed'),
  });

  const events = transformBookingsToEvents(bookings);
  return <div className="booking-calendar-studio">
    <header className="booking-calendar-heading"><div className="booking-calendar-heading-copy"><span className="booking-calendar-mark"><CalendarDays size={21}/></span><div><h3>Booking calendar</h3><p>Plan your team’s day. Keep every booking in view.</p></div></div><span className="booking-calendar-total">{events.length} scheduled {events.length === 1 ? 'booking' : 'bookings'}</span></header>
    <div className="booking-calendar-legend" aria-label="Booking status colours">{statuses.map(status => <span key={status.value} className={'booking-legend-' + status.value}><i aria-hidden="true"/>{status.label}</span>)}</div>
    <Calendar<CalendarEvent>
      localizer={localizer}
      events={events}
      onSelectEvent={event => { if(event.resource) onSelectBooking(event.resource); }}
      startAccessor="start"
      endAccessor="end"
      views={['month', 'week', 'day', 'agenda']}
      eventPropGetter={eventStyleGetter}
      components={{ toolbar: CalendarToolbar, event: BookingEvent }}
      tooltipAccessor={event => event.title + ' · ' + format(event.start, 'HH:mm') + ' · ' + (statuses.find(status => status.value === event.status)?.label || event.status)}
    />
    <p className="booking-calendar-footnote"><span/>Dates and times follow your browser’s local timezone.</p>
  </div>;
};


function StandaloneCalendar(){
 const [bookings,setBookings]=useState<Booking[]>([]),[selected,setSelected]=useState<Booking|null>(null),[error,setError]=useState(false),[loading,setLoading]=useState(true);
 const load=useCallback(async()=>{try{const {data}=await axios.get('/api/admin/bookings');setBookings(data);setError(false);}catch{setError(true);}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();const timer=setInterval(()=>{if(document.visibilityState==='visible')void load();},30000);return()=>clearInterval(timer);},[load]);
 if(loading)return <p role="status">Loading booking calendar…</p>;
 return <>{error&&<p role="alert">Unable to refresh bookings. <button onClick={()=>void load()}>Try again</button></p>}<BookingCalendar bookings={bookings} onSelectBooking={setSelected}/>{selected&&<BookingDetailsModal booking={selected} onClose={()=>{setSelected(null);void load();}}/>}</>;
}
export default function CalendarSurface(props:{bookings?:Booking[];onSelectBooking?:(booking:Booking)=>void}){
 return props.bookings&&props.onSelectBooking?<BookingCalendar bookings={props.bookings} onSelectBooking={props.onSelectBooking}/>:<StandaloneCalendar/>;
}
