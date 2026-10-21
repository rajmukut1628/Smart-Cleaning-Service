import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ChevronUpDownIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid';

interface AssignWorkerProps {
  bookingId: string;
  workers: { _id: string; name: string; }[];
  scheduledDate: string;
  scheduledTime: string;
  allBookings: any[];
  onAssignmentSuccess: () => void;
  initialSelectedWorkers?: string[];
}

export default function AssignWorker({
  bookingId,
  workers,
  scheduledDate,
  scheduledTime,
  allBookings,
  onAssignmentSuccess,
  initialSelectedWorkers = []
}: AssignWorkerProps) {
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>(initialSelectedWorkers);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync state with props when bookings are refreshed
  useEffect(() => {
    setSelectedWorkers(initialSelectedWorkers);
  }, [JSON.stringify(initialSelectedWorkers)]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isWorkerBusy = (workerId: string) => {
    return allBookings.some(booking => {
      if (!booking.worker && (!booking.workers || booking.workers.length === 0)) return false;
      
      const assignedWorkerIds = booking.workers?.map((w: any) => typeof w === 'object' ? w._id : w) || [];
      if (booking.worker) assignedWorkerIds.push(typeof booking.worker === 'object' ? booking.worker._id : booking.worker);

      // Compare only YYYY-MM-DD to avoid time mismatch issues
      const bDate = new Date(booking.scheduledDate).toISOString().split('T')[0];
      const sDate = new Date(scheduledDate).toISOString().split('T')[0];

      return (
        booking._id !== bookingId &&
        assignedWorkerIds.includes(workerId) &&
        bDate === sDate &&
        booking.scheduledTime === scheduledTime &&
        !['cancelled', 'completed'].includes(booking.status)
      );
    });
  };

  const handleToggleWorker = (e: React.MouseEvent, workerId: string) => {
    e.stopPropagation();
    setSelectedWorkers(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleAssign = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedWorkers.length === 0) {
      toast.error('Please select at least one worker.');
      return;
    }

    const busyWorkers = selectedWorkers.filter(id => isWorkerBusy(id));
    if (busyWorkers.length > 0) {
      const busyNames = workers.filter(w => busyWorkers.includes(w._id)).map(w => w.name).join(', ');
      const confirmAssign = window.confirm(
        `The following workers are busy: ${busyNames}. Assign anyway?`
      );
      if (!confirmAssign) return;
    }

    setIsAssigning(true);
    try {
      await axios.put(`/api/admin/bookings/${bookingId}/assign`, {
        workerIds: selectedWorkers,
      });
      toast.success('Workers assigned successfully!');
      onAssignmentSuccess();
      setIsOpen(false);
    } catch (error: any) {
      console.error('Failed to assign workers', error);
      toast.error(error.response?.data?.message || 'Failed to assign workers.');
    } finally {
      setIsAssigning(false);
    }
  };

  const selectedNames = workers
    .filter(w => selectedWorkers.includes(w._id))
    .map(w => w.name)
    .join(', ');

  return (
    <div className="flex items-center space-x-3 w-full max-w-md" ref={dropdownRef}>
      <div className="relative flex-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className={`relative w-full cursor-default rounded-lg py-2.5 pl-3 pr-10 text-left shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 bg-white transition-all duration-200`}
        >
          <span className="block truncate">
            {selectedWorkers.length > 0 ? (
              <span className="text-gray-900 font-medium">{selectedNames || 'Selected workers not in list'}</span>
            ) : (
              <span className="text-gray-500">Select Workers</span>
            )}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </button>

        {isOpen && (
          <ul className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm animate-in fade-in zoom-in duration-200 origin-top">
            {workers.length > 0 ? (
              workers.map((worker) => {
                const busy = isWorkerBusy(worker._id);
                const isSelected = selectedWorkers.includes(worker._id);
                return (
                  <li
                    key={worker._id}
                    className={`relative cursor-pointer select-none py-3 pl-10 pr-4 transition-colors duration-150 hover:bg-gray-50`}
                    onClick={(e) => handleToggleWorker(e, worker._id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`block truncate ${isSelected ? 'font-bold text-blue-600' : 'font-normal text-gray-900'}`}>
                        {worker.name}
                      </span>
                      {busy && (
                        <span className="inline-flex items-center gap-x-1.5 rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700 shadow-sm border border-red-200">
                          <ExclamationTriangleIcon className="h-3 w-3" />
                          Busy
                        </span>
                      )}
                    </div>

                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                        {isSelected && <CheckIcon className="h-4 w-4 text-white" aria-hidden="true" />}
                      </div>
                    </span>
                  </li>
                );
              })
            ) : (
              <li className="py-3 px-4 text-sm text-gray-500 italic text-center">
                No workers found
              </li>
            )}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={handleAssign}
        disabled={isAssigning || selectedWorkers.length === 0}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-extrabold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.97]"
      >
        {isAssigning ? '...' : 'Assign'}
      </button>
    </div>
  );
}
