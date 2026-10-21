import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { XMarkIcon, CalendarIcon, ClockIcon, MapPinIcon, UserIcon, InboxIcon, Squares2X2Icon, ChatBubbleBottomCenterTextIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../../config/apiConfig';

interface BookingDetailsModalProps {
    booking: any;
    onClose: () => void;
}

export default function BookingDetailsModal({ booking, onClose }: BookingDetailsModalProps) {
    const { user } = useAuth();
    const canConfirmPayment = user?.role === 'admin' || user?.role === 'superadmin';
    const [paymentStatus, setPaymentStatus] = useState(booking?.paymentStatus || 'pending');
    const [savingPayment, setSavingPayment] = useState(false);
    const confirmPayment = async () => {
        setSavingPayment(true);
        try {
            const { data } = await axios.put('/api/admin/bookings/' + booking._id + '/payment', { paymentStatus: paymentStatus === 'paid' ? 'pending' : 'paid' });
            setPaymentStatus(data.paymentStatus);
            booking.paymentStatus = data.paymentStatus;
            toast.success('Cash payment updated');
        } catch (error: any) { toast.error(error.response?.data?.message || 'Payment update failed'); }
        finally { setSavingPayment(false); }
    };
    if (!booking) return null;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };

    const statusColors: { [key: string]: string } = {
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
        'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
        completed: 'bg-blue-100 text-blue-800 border-blue-200',
        cancelled: 'bg-red-100 text-red-800 border-red-200',
    };

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm"
                    aria-hidden="true"
                    onClick={onClose}
                ></div>

                {/* Modal panel */}
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border border-gray-100 animate-in fade-in zoom-in duration-300">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-600 px-6 py-4 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2" id="modal-title">
                            <Squares2X2Icon className="h-6 w-6" />
                            Booking Overview
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-blue-100 hover:text-white transition-colors p-1"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="px-6 py-6 space-y-5 max-h-[80vh] overflow-y-auto">

                        <section className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex flex-wrap items-center justify-between gap-3">
                            <div><h4 className="font-semibold text-blue-950">Cash payment</h4><p className="text-sm text-blue-700">৳{booking.totalAmount?.toLocaleString()} · {paymentStatus === 'paid' ? 'Payment received' : 'Awaiting payment'}</p></div>
                            {canConfirmPayment && <button onClick={confirmPayment} disabled={savingPayment || (booking.status !== 'completed' && paymentStatus !== 'paid')} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">{savingPayment ? 'Saving…' : paymentStatus === 'paid' ? 'Undo confirmation' : 'Confirm cash received'}</button>}
                        </section>
                        {/* Main Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Service & Status */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-50 p-3 rounded-xl">
                                        <Squares2X2Icon className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-[10px]">Service</p>
                                        <p className="text-lg font-extrabold text-gray-900 leading-tight">{booking.service?.name}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${statusColors[booking.status] || 'bg-gray-100 text-gray-800'}`}>
                                        {booking.status}
                                    </div>
                                    <div className="text-lg font-black text-blue-600">
                                        ৳{booking.totalAmount.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Schedule */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-50 p-3 rounded-xl">
                                        <CalendarIcon className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-[10px]">Scheduled Date</p>
                                        <p className="font-bold text-gray-900">{formatDate(booking.scheduledDate)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-50 p-3 rounded-xl">
                                        <ClockIcon className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-[10px]">Scheduled Time</p>
                                        <p className="font-bold text-gray-900">{booking.scheduledTime}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* Details Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            {/* Customer Info */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                    <UserIcon className="h-4 w-4 text-gray-400" />
                                    Customer Information
                                </h4>
                                <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <UserIcon className="h-5 w-5 text-gray-400" />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</p>
                                            <p className="text-sm font-bold text-gray-900">{booking.user?.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <InboxIcon className="h-5 w-5 text-gray-400" />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</p>
                                            <p className="text-sm font-bold text-gray-900">{booking.user?.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Property Details */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                    <MapPinIcon className="h-4 w-4 text-gray-400" />
                                    Property Details
                                </h4>
                                <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="flex items-start gap-3">
                                        <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Address</p>
                                            <p className="text-sm font-bold text-gray-900 leading-relaxed">{booking.address}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Squares2X2Icon className="h-5 w-5 text-gray-400" />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Area Size</p>
                                            <p className="text-sm font-bold text-gray-900">{booking.squareFootage} sq. ft.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Special Instructions */}
                        {booking.specialInstructions && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                    <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-gray-400" />
                                    Special Instructions
                                </h4>
                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                                    <p className="text-sm text-amber-900 italic leading-relaxed">"{booking.specialInstructions}"</p>
                                </div>
                            </div>
                        )}

                        {/* Assigned Workers */}
                        {((booking.workers && booking.workers.length > 0) || booking.worker) && (
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black text-blue-900 flex items-center gap-2">
                                        <UserIcon className="h-4 w-4 text-blue-400" />
                                        Assigned Team
                                    </h4>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Job Status</p>
                                        <p className="text-xs font-bold text-blue-600 capitalize">{booking.status}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {booking.workers && booking.workers.length > 0 ? (
                                        booking.workers.map((worker: any) => (
                                            <div key={worker?._id} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-blue-100">
                                                <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                    {(worker?.name || '?').charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-blue-900">{worker?.name || 'Assigned Worker'}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : booking.worker ? (
                                        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-blue-100">
                                            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                {(booking.worker.name || '?').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-blue-900">{booking.worker.name || 'Assigned Worker'}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-400 italic">No worker assigned yet</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Images Section */}
                        {((booking.beforeImages && booking.beforeImages.length > 0) || (booking.afterImages && booking.afterImages.length > 0)) && (
                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                    <PhotoIcon className="h-4 w-4 text-gray-400" />
                                    Work Progress Images
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Before Images */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Before Cleaning</p>
                                        {booking.beforeImages && booking.beforeImages.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                {booking.beforeImages.map((img: string, idx: number) => (
                                                    <img
                                                        key={idx}
                                                        src={`${API_BASE_URL}${img}`}
                                                        alt="Before"
                                                        className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:scale-105 transition-transform cursor-pointer"
                                                        onClick={() => window.open(`${API_BASE_URL}${img}`, '_blank')}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic">No images uploaded yet.</p>
                                        )}
                                    </div>

                                    {/* After Images */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest text-blue-600">After Cleaning</p>
                                        {booking.afterImages && booking.afterImages.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                {booking.afterImages.map((img: string, idx: number) => (
                                                    <img
                                                        key={idx}
                                                        src={`${API_BASE_URL}${img}`}
                                                        alt="After"
                                                        className="w-full h-32 object-cover rounded-lg border border-blue-200 hover:scale-105 transition-transform cursor-pointer"
                                                        onClick={() => window.open(`${API_BASE_URL}${img}`, '_blank')}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic">Work still in progress.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    <div className="bg-gray-50 px-6 py-4 flex justify-end">
                        <button
                            type="button"
                            className="px-6 py-2 bg-gray-900 text-white text-sm font-black rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
                            onClick={onClose}
                        >
                            CLOSE OVERVIEW
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
