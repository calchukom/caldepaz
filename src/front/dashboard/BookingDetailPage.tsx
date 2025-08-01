import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Calendar,
    Car,
    MapPin,
    FileText,
    CreditCard,
    Phone,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Clock3,
    Receipt,
    MessageCircle
} from 'lucide-react';
import bookingApiService from '../../services/api/booking';
import paymentApiService from '../../services/api/payment';
import { Booking, BookingStatus } from '../../types/booking';
import { formatCurrency } from '../../utils/number';

const BookingDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cancelLoading, setCancelLoading] = useState(false);

    useEffect(() => {
        const fetchBookingDetails = async () => {
            if (!id) {
                navigate('/dashboard/bookings');
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const response = await bookingApiService.getBookingById(id);
                if (response.data) {
                    setBooking(response.data);
                } else {
                    setError('Failed to load booking details');
                }
            } catch (err: any) {
                setError(err.message || 'An error occurred while fetching booking details');
                toast.error('Failed to load booking details. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchBookingDetails();
    }, [id, navigate]);

    // Format date strings to readable format
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Format time from date string
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Calculate booking duration in days
    const calculateDuration = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Get status badge color and icon
    const getStatusDetails = (status: BookingStatus) => {
        switch (status) {
            case 'pending':
                return {
                    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    icon: <Clock3 className="w-5 h-5" />
                };
            case 'confirmed':
                return {
                    color: 'bg-green-100 text-green-800 border-green-200',
                    icon: <CheckCircle2 className="w-5 h-5" />
                };
            case 'active':
                return {
                    color: 'bg-blue-100 text-blue-800 border-blue-200',
                    icon: <Car className="w-5 h-5" />
                };
            case 'completed':
                return {
                    color: 'bg-purple-100 text-purple-800 border-purple-200',
                    icon: <CheckCircle2 className="w-5 h-5" />
                };
            case 'cancelled':
                return {
                    color: 'bg-red-100 text-red-800 border-red-200',
                    icon: <XCircle className="w-5 h-5" />
                };
            default:
                return {
                    color: 'bg-gray-100 text-gray-800 border-gray-200',
                    icon: <AlertCircle className="w-5 h-5" />
                };
        }
    };

    // Handle booking cancellation
    const handleCancelBooking = async () => {
        if (!booking || !window.confirm('Are you sure you want to cancel this booking?')) {
            return;
        }

        setCancelLoading(true);
        try {
            const response = await bookingApiService.updateBookingStatus(booking.booking_id, {
                booking_status: 'cancelled'
            });
            if (response.data) {
                setBooking(response.data);
                toast.success('Booking cancelled successfully');
            } else {
                toast.error('Failed to cancel booking');
            }
        } catch (err: any) {
            toast.error(err.message || 'An error occurred while cancelling the booking');
        } finally {
            setCancelLoading(false);
        }
    };

    // Create a support ticket related to this booking
    const handleCreateSupportTicket = () => {
        navigate('/dashboard/support/new', {
            state: {
                bookingId: booking?.booking_id,
                subject: `Support for Booking #${booking?.booking_id}`,
                vehicleId: booking?.vehicle_id
            }
        });
    };

    // Download receipt for the booking
    const handleDownloadReceipt = async () => {
        if (!booking?.payments?.[0]) {
            toast.error('No payment information available for this booking');
            return;
        }

        try {
            const response = await paymentApiService.getPaymentReceipt(booking.payments[0].payment_id);
            if (response.data?.receipt_url) {
                // Open in new tab or download the receipt
                window.open(response.data.receipt_url, '_blank');
            } else {
                toast.error('Receipt not available');
            }
        } catch (err) {
            toast.error('Failed to download receipt');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-600">Loading booking details...</p>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="container mx-auto px-4 py-8">
                <button
                    onClick={() => navigate('/dashboard/bookings')}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Bookings</span>
                </button>

                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-medium text-red-800 mb-2">Booking Not Found</h3>
                    <p className="text-red-600">
                        {error || "The booking you're looking for doesn't exist or you don't have permission to view it."}
                    </p>
                    <button
                        onClick={() => navigate('/dashboard/bookings')}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Return to My Bookings
                    </button>
                </div>
            </div>
        );
    }

    const statusDetails = getStatusDetails(booking.booking_status);
    const duration = calculateDuration(booking.booking_date, booking.return_date);
    const canCancel = booking.booking_status === 'pending' || booking.booking_status === 'confirmed';

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Back Button */}
            <button
                onClick={() => navigate('/dashboard/bookings')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Bookings</span>
            </button>

            {/* Header */}
            <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <h1 className="text-2xl font-bold text-gray-900">Booking #{booking.booking_id}</h1>
                            <div className={`inline-flex items-center px-3 py-1 rounded-full ${statusDetails.color} text-sm font-medium border`}>
                                {statusDetails.icon}
                                <span className="ml-1 capitalize">
                                    {booking.booking_status === 'active' ? 'In Progress' : booking.booking_status.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                        <p className="text-gray-600">Created on {formatDate(booking.created_at)}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCreateSupportTicket}
                            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Contact Support
                        </button>

                        {booking.payments && booking.payments.length > 0 && (
                            <button
                                onClick={handleDownloadReceipt}
                                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                <Receipt className="mr-2 h-4 w-4" />
                                Receipt
                            </button>
                        )}

                        {canCancel && (
                            <button
                                onClick={handleCancelBooking}
                                disabled={cancelLoading}
                                className="inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                {cancelLoading ? 'Cancelling...' : 'Cancel Booking'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Rental Period */}
                    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
                        <div className="border-b border-gray-100 px-6 py-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                <Calendar className="w-5 h-5 mr-2 text-primary" />
                                Rental Period
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-1">Pick-up Date & Time</h3>
                                    <p className="text-gray-900 font-medium">
                                        {formatDate(booking.booking_date)}
                                    </p>
                                    <p className="text-gray-600">
                                        {formatTime(booking.booking_date)}
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-1">Return Date & Time</h3>
                                    <p className="text-gray-900 font-medium">
                                        {formatDate(booking.return_date)}
                                    </p>
                                    <p className="text-gray-600">
                                        {formatTime(booking.return_date)}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-gray-700">
                                    <span className="font-semibold">Duration:</span>{' '}
                                    {duration} {duration === 1 ? 'day' : 'days'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Vehicle Details */}
                    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
                        <div className="border-b border-gray-100 px-6 py-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                <Car className="w-5 h-5 mr-2 text-primary" />
                                Vehicle Details
                            </h2>
                        </div>
                        <div className="p-6">
                            {booking.vehicle ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-3 flex items-center mb-2">
                                        <h3 className="text-xl font-bold text-gray-900">
                                            {booking.vehicle.vehicleSpec?.manufacturer} {booking.vehicle.vehicleSpec?.model} ({booking.vehicle.vehicleSpec?.year})
                                        </h3>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">License Plate</h4>
                                        <p className="text-gray-900">{booking.vehicle.license_plate || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Vehicle Type</h4>
                                        <p className="text-gray-900">{booking.vehicle.vehicleSpec?.vehicle_category || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Transmission</h4>
                                        <p className="text-gray-900">{booking.vehicle.vehicleSpec?.transmission || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Fuel Type</h4>
                                        <p className="text-gray-900">{booking.vehicle.vehicleSpec?.fuel_type || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Seating Capacity</h4>
                                        <p className="text-gray-900">{booking.vehicle.vehicleSpec?.seating_capacity || 'N/A'} seats</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-1">Color</h4>
                                        <p className="text-gray-900">{booking.vehicle.vehicleSpec?.color || 'N/A'}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500">Vehicle details are not available</p>
                            )}
                        </div>
                    </div>

                    {/* Location */}
                    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
                        <div className="border-b border-gray-100 px-6 py-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                <MapPin className="w-5 h-5 mr-2 text-primary" />
                                Pickup & Return Location
                            </h2>
                        </div>
                        <div className="p-6">
                            {booking.location ? (
                                <div>
                                    <h3 className="font-medium text-gray-900 mb-2">{booking.location.name}</h3>
                                    <p className="text-gray-600 mb-4">{booking.location.address}</p>
                                    {booking.location.contact_phone && (
                                        <div className="flex items-center text-gray-600">
                                            <Phone className="w-4 h-4 mr-2" />
                                            <span>{booking.location.contact_phone}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-500">Location details are not available</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Summary & Payment */}
                <div className="space-y-6">
                    {/* Price Summary */}
                    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
                        <div className="border-b border-gray-100 px-6 py-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-primary" />
                                Price Summary
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Vehicle Rental ({duration} {duration === 1 ? 'day' : 'days'})</span>
                                    <span className="text-gray-900 font-medium">
                                        {formatCurrency(parseFloat(booking.total_amount) * 0.85)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Taxes & Fees</span>
                                    <span className="text-gray-900 font-medium">
                                        {formatCurrency(parseFloat(booking.total_amount) * 0.15)}
                                    </span>
                                </div>
                                <div className="border-t border-gray-100 pt-4 flex justify-between">
                                    <span className="text-gray-900 font-bold">Total Amount</span>
                                    <span className="text-primary font-bold">
                                        {formatCurrency(parseFloat(booking.total_amount))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Information */}
                    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
                        <div className="border-b border-gray-100 px-6 py-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                <CreditCard className="w-5 h-5 mr-2 text-primary" />
                                Payment Information
                            </h2>
                        </div>
                        <div className="p-6">
                            {booking.payments && booking.payments.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Payment Method</span>
                                        <span className="text-gray-900 font-medium capitalize">
                                            {booking.payments[0].payment_method}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Payment Status</span>
                                        <span className={`font-medium capitalize ${booking.payments[0].payment_status === 'completed' ? 'text-green-600' :
                                            booking.payments[0].payment_status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                                            }`}>
                                            {booking.payments[0].payment_status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Payment Date</span>
                                        <span className="text-gray-900 font-medium">
                                            {formatDate(booking.payments[0].created_at)}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500">No payment information available</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingDetailPage;