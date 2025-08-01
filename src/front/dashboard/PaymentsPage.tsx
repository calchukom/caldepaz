import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Search,
    CreditCard,
    AlertCircle,
    Receipt,
    ArrowUpRight,
    Smartphone
} from 'lucide-react';
import paymentApiService from '../../services/api/payment';
import { Payment, PaymentStatus } from '../../types/payment';
import { formatCurrency } from '../../utils/number';

const PaymentsPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [justCompletedPaymentId, setJustCompletedPaymentId] = useState<string | null>(null);

    // Check if user just completed a payment
    useEffect(() => {
        if (location.state?.justCompleted && location.state?.paymentId) {
            setJustCompletedPaymentId(location.state.paymentId);

            // Show a welcome message
            setTimeout(() => {
                toast.success(
                    'Payment completed successfully! Your payment is highlighted below.',
                    { duration: 4000 }
                );
            }, 500);

            // Clear the state to prevent showing the message again
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Auto-clear the just completed highlighting after 10 seconds
    useEffect(() => {
        if (justCompletedPaymentId) {
            const timer = setTimeout(() => {
                setJustCompletedPaymentId(null);
            }, 10000); // 10 seconds

            return () => clearTimeout(timer);
        }
    }, [justCompletedPaymentId]);

    // Fetch user payments
    const fetchPayments = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await paymentApiService.getUserPayments(page, limit);

            if (response.data) {
                setPayments(response.data.payments);
                setTotalPages(response.data.pagination.totalPages);
            } else {
                setError('Failed to load payment history');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching payment history');
            toast.error('Failed to load your payment history. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    // Initial load and on page change
    useEffect(() => {
        fetchPayments();
    }, [page]);

    // Format date to readable format
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
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

    // Get payment method icon
    const getPaymentMethodIcon = (method: string) => {
        switch (method.toLowerCase()) {
            case 'stripe':
                return <CreditCard className="w-5 h-5" />;
            case 'mpesa':
                return <Smartphone className="w-5 h-5" />;
            default:
                return <CreditCard className="w-5 h-5" />;
        }
    };

    // Get status badge details
    const getStatusDetails = (status: PaymentStatus) => {
        switch (status) {
            case 'completed':
                return {
                    color: 'bg-green-100 text-green-800 border-green-200',
                    textColor: 'text-green-800'
                };
            case 'pending':
                return {
                    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    textColor: 'text-yellow-800'
                };
            case 'failed':
                return {
                    color: 'bg-red-100 text-red-800 border-red-200',
                    textColor: 'text-red-800'
                };
            case 'refunded':
                return {
                    color: 'bg-purple-100 text-purple-800 border-purple-200',
                    textColor: 'text-purple-800'
                };
            default:
                return {
                    color: 'bg-gray-100 text-gray-800 border-gray-200',
                    textColor: 'text-gray-800'
                };
        }
    };

    // Download payment receipt
    const handleDownloadReceipt = async (paymentId: string) => {
        try {
            const response = await paymentApiService.getPaymentReceipt(paymentId);

            if (response.data?.receipt_url) {
                window.open(response.data.receipt_url, '_blank');
            } else {
                toast.error('Receipt not available for this payment');
            }
        } catch (error) {
            toast.error('Failed to download receipt');
        }
    };

    // View booking details related to payment
    const handleViewBooking = (bookingId: string) => {
        navigate(`/dashboard/bookings/${bookingId}`);
    };

    // Filter payments by search query
    const filteredPayments = payments.filter(payment => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        return (
            payment.payment_id.toLowerCase().includes(query) ||
            payment.booking_id.toLowerCase().includes(query) ||
            payment.payment_method.toLowerCase().includes(query) ||
            payment.payment_status.toLowerCase().includes(query)
        );
    });

    // Format payment amount
    const formatPaymentAmount = (amount: string) => {
        return formatCurrency(parseFloat(amount));
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment History</h1>
                <p className="text-gray-600">View and manage your payment records</p>
            </div>

            {/* Search Bar */}
            <div className="mb-8">
                <div className="relative max-w-md">
                    <input
                        type="text"
                        placeholder="Search payments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
            </div>

            {/* Payments List */}
            <div className="space-y-6">
                {loading ? (
                    // Loading state
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-gray-600">Loading your payment history...</p>
                    </div>
                ) : error ? (
                    // Error state
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                        <h3 className="text-lg font-medium text-red-800 mb-2">Failed to load payments</h3>
                        <p className="text-red-600">{error}</p>
                        <button
                            onClick={fetchPayments}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : filteredPayments.length === 0 ? (
                    // Empty state
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                        <CreditCard className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-xl font-medium text-gray-800 mb-2">No payment records found</h3>
                        <p className="text-gray-600 mb-6">
                            {searchQuery
                                ? "No payments match your search criteria."
                                : "You haven't made any payments yet."}
                        </p>
                        <button
                            onClick={() => navigate('/vehicles')}
                            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                        >
                            Browse Vehicles
                        </button>
                    </div>
                ) : (
                    // Payments list
                    <>
                        <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Payment ID
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Method
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredPayments.map((payment) => {
                                        const statusDetails = getStatusDetails(payment.payment_status);
                                        const isJustCompleted = justCompletedPaymentId === payment.payment_id;
                                        const rowClassName = isJustCompleted
                                            ? "hover:bg-gray-50 bg-green-50 border-2 border-green-300 ring-2 ring-green-200 ring-opacity-50"
                                            : "hover:bg-gray-50";

                                        return (
                                            <tr key={payment.payment_id} className={rowClassName}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <div className="text-sm font-medium text-gray-900">#{payment.payment_id.slice(0, 8)}</div>
                                                        {isJustCompleted && (
                                                            <div className="text-xs text-green-600 font-medium flex items-center mt-1">
                                                                <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                                                                Just Completed
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{formatDate(payment.created_at)}</div>
                                                    <div className="text-xs text-gray-500">{formatTime(payment.created_at)}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        {getPaymentMethodIcon(payment.payment_method)}
                                                        <span className="ml-2 text-sm text-gray-900 capitalize">{payment.payment_method}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {formatPaymentAmount(payment.amount.toString())}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{payment.currency}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium ${statusDetails.color} rounded-full capitalize`}>
                                                        {payment.payment_status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <button
                                                            onClick={() => handleViewBooking(payment.booking_id)}
                                                            className="text-blue-600 hover:text-blue-900 flex items-center"
                                                            title="View Booking"
                                                        >
                                                            <ArrowUpRight className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadReceipt(payment.payment_id)}
                                                            className="text-gray-600 hover:text-gray-900 flex items-center"
                                                            title="Download Receipt"
                                                        >
                                                            <Receipt className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center mt-8">
                                <div className="inline-flex items-center rounded-lg">
                                    <button
                                        onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 border border-gray-300 rounded-l-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        Previous
                                    </button>

                                    <div className="px-4 py-2 border-t border-b border-gray-300 bg-white text-gray-700">
                                        Page {page} of {totalPages}
                                    </div>

                                    <button
                                        onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 border border-gray-300 rounded-r-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentsPage;