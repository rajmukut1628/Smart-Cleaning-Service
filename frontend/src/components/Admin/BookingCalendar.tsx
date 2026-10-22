import { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enUS } from 'date-fns/locale/en-US';
import axios from 'axios';
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
  user: { name: string };
  scheduledDate: string;
  scheduledTime: string; // e.g., "10:00"
  status: string;
}

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: Booking;
  status?: string; // Add status for color coding
}

const BookingCalendar = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Function to style events based on status
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3b82f6'; // Default blue

    switch (event.status) {
      case 'pending':
        backgroundColor = '#f59e0b'; // Orange/Yellow
        break;
      case 'confirmed':
        backgroundColor = '#2563eb'; // Green
        break;
      case 'in-progress':
        backgroundColor = '#3b82f6'; // Blue
        break;
      case 'completed':
        backgroundColor = '#6b7280'; // Gray
        break;
      case 'cancelled':
        backgroundColor = '#ef4444'; // Red
        break;
      default:
        backgroundColor = '#1e40af'; // Purple
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        fontWeight: '500',
      }
    };
  };

  const fetchBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/admin/bookings');
      const calendarEvents = transformBookingsToEvents(response.data);
      setEvents(calendarEvents);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      setError('Could not load booking data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  if (isLoading) {
    return <div className="p-4 text-center">Loading calendar...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4" style={{ height: '700px' }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Booking Calendar</h3>

        {/* Color Legend */}
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#2563eb' }}></div>
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#6b7280' }}></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <span>Cancelled</span>
          </div>
        </div>
      </div>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 620 }}
        eventPropGetter={eventStyleGetter}
      />
    </div>
  );
};

export default BookingCalendar;
