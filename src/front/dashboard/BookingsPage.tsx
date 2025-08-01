import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Calendar,
    Car,
    MapPin,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Clock3,
    X,
    Eye,
    RefreshCw,
    CalendarDays,
    MapPinIcon,
    Banknote,
    Phone
} from 'lucide-react';
import BookingService, {
    Booking,
    formatCurrency,
    formatDate,
    getStatusColor,
    getBookingStatusText,
    canCancelBooking,
    canModifyBooking
} from '../../services/bookingService';

// Types
interface BookingFilters {
    search: string;
    status: string;
    date_from: string;
    date_to: string;
    page: number;
    limit: number;
}

const BookingsPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [justCompletedBookingId, setJustCompletedBookingId] = useState<string | null>(null);

    // Check if user just completed a booking
    useEffect(() => {
        if (location.state?.justCompleted && location.state?.bookingId) {
            setJustCompletedBookingId(location.state.bookingId);

            // Show a welcome message
            setTimeout(() => {
                toast.success(
                    'Welcome to your dashboard! Your new booking is highlighted below.',
                    { duration: 4000 }
                );
            }, 500);

            // Clear the state to prevent showing the message again
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Auto-clear the just completed highlighting after 10 seconds
    useEffect(() => {
        if (justCompletedBookingId) {
            const timer = setTimeout(() => {
                setJustCompletedBookingId(null);
            }, 10000); // 10 seconds

            return () => clearTimeout(timer);
        }
    }, [justCompletedBookingId]);

    const [filters, setFilters] = useState<BookingFilters>({
        search: '',
        status: '',
        date_from: '',
        date_to: '',
        page: 1,
        limit: 10
    });

    const [pagination, setPagination] = useState({
        totalPages: 1,
        currentPage: 1,
        totalBookings: 0
    });

    // Fetch user's bookings using BookingService
    const fetchUserBookings = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await BookingService.getUserBookings({
                page: filters.page,
                limit: filters.limit,
                search: filters.search || undefined,
                status: filters.status || undefined,
                date_from: filters.date_from || undefined,
                date_to: filters.date_to || undefined
            });

            if (response.success) {
                // Ensure bookings is always an array
                const bookingsData = Array.isArray(response.data) ? response.data : [];
                setBookings(bookingsData);

                if (response.pagination) {
                    setPagination({
                        totalPages: response.pagination.totalPages,
                        currentPage: response.pagination.currentPage,
                        totalBookings: response.pagination.totalItems
                    });
                }
            } else {
                throw new Error(response.message || 'Failed to fetch bookings');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
            setError(errorMessage);
            toast.error(`Failed to fetch bookings: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    // Cancel booking
    const handleCancelBooking = async (bookingId: string, reason: string) => {
        try {
            const response = await BookingService.cancelBooking(bookingId, reason);
            if (response.success) {
                toast.success('Booking cancelled successfully');
                fetchUserBookings(); // Refresh the list
                setShowCancelModal(false);
                setSelectedBooking(null);
                setCancelReason('');
            } else {
                throw new Error(response.message || 'Failed to cancel booking');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
            toast.error(`Failed to cancel booking: ${errorMessage}`);
        }
    };

    // Load data on component mount and filter changes
    useEffect(() => {
        fetchUserBookings();
    }, [filters]);

    // Handle filter changes
    const handleFilterChange = (key: keyof BookingFilters, value: string | number) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: key !== 'page' ? 1 : Number(value)
        }));
    };

    // Handle page change
    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            handleFilterChange('page', newPage);
        }
    };

    // Get status icon
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <AlertCircle className="h-5 w-5 text-yellow-500" />;
            case 'confirmed':
                return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
            case 'in_progress':
                return <Clock3 className="h-5 w-5 text-purple-500" />;
            case 'completed':
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'cancelled':
                return <XCircle className="h-5 w-5 text-red-500" />;
            default:
                return <AlertCircle className="h-5 w-5 text-gray-500" />;
        }
    };

    // Render booking card
    const renderBookingCard = (booking: Booking) => {
        const isJustCompleted = justCompletedBookingId === booking.booking_id;
        const cardClassName = isJustCompleted
            ? "bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-500 border-2 border-green-400 ring-2 ring-green-200 ring-opacity-50"
            : "bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200";

        return (
            <div key={booking.booking_id} className={cardClassName}>
                <div className="p-6">
                    {/* Just Completed Badge */}
                    {isJustCompleted && (
                        <div className="mb-4 flex justify-center">
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Just Completed!
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                                <Car className="h-8 w-8 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {booking.vehicle_name || `${booking.vehicle_make} ${booking.vehicle_model}`}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Booking #{booking.booking_id.slice(-8)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {getStatusIcon(booking.booking_status)}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.booking_status)}`}>
                                {getBookingStatusText(booking.booking_status)}
                            </span>
                        </div>
                    </div>

                    {/* Booking Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-600">Pickup</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {formatDate(booking.booking_date)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-600">Return</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {formatDate(booking.return_date)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <MapPinIcon className="h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-600">Location</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {booking.location_name}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Banknote className="h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-600">Total Amount</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {formatCurrency(booking.total_amount)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Special Requests */}
                    {booking.special_requests && (
                        <div className="mb-4">
                            <p className="text-sm text-gray-600">Special Requests:</p>
                            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                {booking.special_requests}
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-500">
                            Created: {formatDate(booking.created_at)}
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowDetails(true);
                                }}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                            >
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                            </button>

                            {canCancelBooking(booking) && (
                                <button
                                    onClick={() => {
                                        setSelectedBooking(booking);
                                        setShowCancelModal(true);
                                    }}
                                    className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md text-sm text-red-700 hover:bg-red-50"
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                </button>
                            )}

                            {canModifyBooking(booking) && (
                                <button
                                    onClick={() => navigate(`/booking/modify/${booking.booking_id}`)}
                                    className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-sm text-blue-700 hover:bg-blue-50"
                                >
                                    Modify
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                        <Calendar className="h-8 w-8 mr-3 text-blue-600" />
                        My Bookings
                    </h1>
                    <p className="mt-2 text-gray-600">
                        View and manage your vehicle rental bookings
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow mb-6 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Search
                            </label>
                            <div className="relative">
                                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search bookings..."
                                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date From
                            </label>
                            <input
                                type="date"
                                className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                value={filters.date_from}
                                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date To
                            </label>
                            <input
                                type="date"
                                className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                value={filters.date_to}
                                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                        <button
                            onClick={() => {
                                setFilters({
                                    search: '',
                                    status: '',
                                    date_from: '',
                                    date_to: '',
                                    page: 1,
                                    limit: 10
                                });
                            }}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Clear Filters
                        </button>

                        <button
                            onClick={fetchUserBookings}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Bookings List */}
                <div className="space-y-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
                            <p className="text-gray-600">Loading your bookings...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <div className="mb-4">
                                <XCircle className="h-12 w-12 mx-auto text-red-500" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Bookings</h3>
                            <p className="text-gray-600 mb-4">{error}</p>
                            <button
                                onClick={fetchUserBookings}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Try Again
                            </button>
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="mb-4">
                                <Calendar className="h-12 w-12 mx-auto text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Found</h3>
                            <p className="text-gray-600 mb-6">
                                You haven't made any vehicle bookings yet. Start exploring our vehicles!
                            </p>
                            <button
                                onClick={() => navigate('/vehicles')}
                                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                <Car className="h-5 w-5 mr-2" />
                                Browse Vehicles
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Bookings Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {Array.isArray(bookings) && bookings.length > 0 && bookings.map(renderBookingCard)}
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="flex justify-center items-center space-x-2 mt-8">
                                    <button
                                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                                        disabled={pagination.currentPage <= 1}
                                        className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>

                                    <div className="flex space-x-1">
                                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                            const pageNum = i + 1;
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className={`px-3 py-2 rounded-md text-sm ${pageNum === pagination.currentPage
                                                        ? 'bg-blue-600 text-white'
                                                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                                        disabled={pagination.currentPage >= pagination.totalPages}
                                        className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}

                            {/* Pagination Info */}
                            <div className="text-center text-sm text-gray-600">
                                Showing {(pagination.currentPage - 1) * filters.limit + 1} to{' '}
                                {Math.min(pagination.currentPage * filters.limit, pagination.totalBookings)} of{' '}
                                {pagination.totalBookings} bookings
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Booking Details Modal */}
            {showDetails && selectedBooking && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Booking Details - #{selectedBooking.booking_id.slice(-8)}
                            </h3>
                            <button
                                onClick={() => setShowDetails(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Vehicle Information */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Vehicle Information</h4>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">Vehicle:</span>
                                        <span className="ml-2 text-gray-900">
                                            {selectedBooking.vehicle_name || `${selectedBooking.vehicle_make} ${selectedBooking.vehicle_model}`}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">License Plate:</span>
                                        <span className="ml-2 text-gray-900">{selectedBooking.vehicle_license_plate}</span>
                                    </div>
                                    {selectedBooking.vehicle_image_url && (
                                        <div className="mt-2">
                                            <img
                                                src={selectedBooking.vehicle_image_url}
                                                alt="Vehicle"
                                                className="w-32 h-24 object-cover rounded-md"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Booking Information */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Booking Information</h4>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">Pickup Date:</span>
                                        <span className="ml-2 text-gray-900">{formatDate(selectedBooking.booking_date)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Return Date:</span>
                                        <span className="ml-2 text-gray-900">{formatDate(selectedBooking.return_date)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Location:</span>
                                        <span className="ml-2 text-gray-900">{selectedBooking.location_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Status:</span>
                                        <span className="ml-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedBooking.booking_status)}`}>
                                                {getBookingStatusText(selectedBooking.booking_status)}
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Information */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Payment Information</h4>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">Total Amount:</span>
                                        <span className="ml-2 text-gray-900 font-semibold">
                                            {formatCurrency(selectedBooking.total_amount)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Payment Status:</span>
                                        <span className="ml-2 text-gray-900">{selectedBooking.payment_status || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Payment Method:</span>
                                        <span className="ml-2 text-gray-900">{selectedBooking.payment_method || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Information */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Additional Information</h4>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">Special Requests:</span>
                                        <span className="ml-2 text-gray-900">
                                            {selectedBooking.special_requests || 'None'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Created:</span>
                                        <span className="ml-2 text-gray-900">{formatDate(selectedBooking.created_at)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Last Updated:</span>
                                        <span className="ml-2 text-gray-900">{formatDate(selectedBooking.updated_at)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Location Contact Information */}
                        {(selectedBooking.location_address || selectedBooking.location_phone) && (
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                <h4 className="text-sm font-medium text-blue-900 mb-2">Location Contact</h4>
                                <div className="space-y-1 text-sm">
                                    {selectedBooking.location_address && (
                                        <div className="flex items-center">
                                            <MapPin className="h-4 w-4 text-blue-600 mr-2" />
                                            <span className="text-blue-800">{selectedBooking.location_address}</span>
                                        </div>
                                    )}
                                    {selectedBooking.location_phone && (
                                        <div className="flex items-center">
                                            <Phone className="h-4 w-4 text-blue-600 mr-2" />
                                            <span className="text-blue-800">{selectedBooking.location_phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end space-x-3">
                            {canCancelBooking(selectedBooking) && (
                                <button
                                    onClick={() => {
                                        setShowDetails(false);
                                        setShowCancelModal(true);
                                    }}
                                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                                >
                                    Cancel Booking
                                </button>
                            )}

                            {canModifyBooking(selectedBooking) && (
                                <button
                                    onClick={() => {
                                        setShowDetails(false);
                                        navigate(`/booking/modify/${selectedBooking.booking_id}`);
                                    }}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                >
                                    Modify Booking
                                </button>
                            )}

                            <button
                                onClick={() => setShowDetails(false)}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Booking Modal */}
            {showCancelModal && selectedBooking && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Cancel Booking
                            </h3>
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-4">
                                Are you sure you want to cancel this booking? This action cannot be undone.
                            </p>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                <div className="flex">
                                    <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-yellow-800">
                                        <p className="font-medium">Cancellation Policy</p>
                                        <p>Cancellations made more than 24 hours before pickup may be eligible for a refund.</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Reason for Cancellation (Optional)
                                </label>
                                <textarea
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    rows={3}
                                    className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Please let us know why you're cancelling..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                            >
                                Keep Booking
                            </button>
                            <button
                                onClick={() => handleCancelBooking(selectedBooking.booking_id, cancelReason)}
                                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                            >
                                Cancel Booking
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingsPage;