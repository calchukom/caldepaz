import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Car,
    Calendar,
    CreditCard,
    TrendingUp,
    MapPin,
    Clock,
    Star,
    Users,
    DollarSign,
    Activity,
    Bell,
    ChevronRight,
    Plus,
    AlertCircle
} from 'lucide-react';
import { selectCurrentUser } from '../auth/store/authSlice';

// Import services for real data
import BookingService from '../../services/bookingService';
import paymentApiService from '../../services/api/payment';
import { notificationService } from '../../services/notificationService';

interface DashboardStats {
    totalBookings: number;
    activeRentals: number;
    totalSpent: number;
    savedAmount: number;
    favoriteVehicles: number;
    loyaltyPoints: number;
}

interface RecentBooking {
    id: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear: number;
    pickupDate: string;
    returnDate: string;
    location: string;
    status: 'upcoming' | 'active' | 'completed' | 'cancelled';
    totalAmount: number;
    image: string;
}

interface Notification {
    id: string;
    type: 'booking' | 'payment' | 'promotion' | 'reminder';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
}

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const currentUser = useSelector(selectCurrentUser);

    const [stats, setStats] = useState<DashboardStats>({
        totalBookings: 0,
        activeRentals: 0,
        totalSpent: 0,
        savedAmount: 0,
        favoriteVehicles: 0,
        loyaltyPoints: 0
    });

    const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTimeRange, setSelectedTimeRange] = useState('30');

    // Load dashboard data from APIs
    const loadDashboardData = async () => {
        setLoading(true);
        setError(null);

        try {
            await Promise.all([
                loadBookingStats(),
                loadRecentBookings(),
                loadNotifications()
            ]);
        } catch (err: any) {
            console.error('Failed to load dashboard data:', err);
            setError(err.message || 'Failed to load dashboard data');
            toast.error('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const loadBookingStats = async () => {
        try {
            // Get user bookings with proper error handling
            let bookings: any[] = [];
            try {
                const bookingsResponse = await BookingService.getUserBookings();
                // Handle different response structures
                if (bookingsResponse && bookingsResponse.data) {
                    bookings = Array.isArray(bookingsResponse.data) 
                        ? bookingsResponse.data 
                        : (bookingsResponse.data.bookings || []);
                }
            } catch (bookingError) {
                console.warn('Failed to load bookings:', bookingError);
                bookings = [];
            }

            // Get user payments with proper error handling
            let payments: any[] = [];
            if (currentUser?.id) {
                try {
                    const paymentsResponse = await paymentApiService.getUserPayments(1, 100);
                    if (paymentsResponse && paymentsResponse.data) {
                        payments = Array.isArray(paymentsResponse.data) 
                            ? paymentsResponse.data 
                            : (paymentsResponse.data.payments || []);
                    }
                } catch (paymentError) {
                    console.warn('Failed to load payments (non-critical):', paymentError);
                    payments = [];
                }
            }

            // Calculate stats with safe defaults
            const totalBookings = Array.isArray(bookings) ? bookings.length : 0;
            const activeRentals = Array.isArray(bookings) ? bookings.filter((b: any) =>
                b && b.booking_status && ['confirmed', 'active', 'pending', 'in_progress'].includes(b.booking_status)
            ).length : 0;

            const totalSpent = Array.isArray(payments) ? payments
                .filter((p: any) => p && p.payment_status === 'completed')
                .reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0) : 0;

            const completedBookings = Array.isArray(bookings) ? bookings.filter((b: any) => 
                b && b.booking_status === 'completed'
            ).length : 0;
            
            const savedAmount = completedBookings * 50; // Estimated savings per booking
            const loyaltyPoints = Math.floor(totalSpent / 10); // 1 point per 10 KES spent

            setStats({
                totalBookings,
                activeRentals,
                totalSpent,
                savedAmount,
                favoriteVehicles: 0, // Would need favorites API
                loyaltyPoints
            });
        } catch (err) {
            console.error('Failed to load booking stats:', err);
            // Set default stats instead of throwing
            setStats({
                totalBookings: 0,
                activeRentals: 0,
                totalSpent: 0,
                savedAmount: 0,
                favoriteVehicles: 0,
                loyaltyPoints: 0
            });
        }
    };

    const loadRecentBookings = async () => {
        try {
            const response = await BookingService.getUserBookings();
            
            // Handle different response structures
            let bookings: any[] = [];
            if (response && response.data) {
                bookings = Array.isArray(response.data) 
                    ? response.data 
                    : (response.data.bookings || []);
            }

            // Ensure bookings is an array before sorting
            if (!Array.isArray(bookings)) {
                console.warn('Bookings data is not an array:', bookings);
                bookings = [];
            }

            // Get the 5 most recent bookings
            const recentBookings = bookings
                .filter((booking: any) => booking && booking.created_at) // Filter out invalid entries
                .sort((a: any, b: any) => {
                    const dateA = new Date(a.created_at || 0).getTime();
                    const dateB = new Date(b.created_at || 0).getTime();
                    return dateB - dateA;
                })
                .slice(0, 5);

            const formattedBookings: RecentBooking[] = recentBookings.map((booking: any) => ({
                id: booking.booking_id || booking.id || 'unknown',
                vehicleMake: booking.vehicle?.vehicleSpec?.manufacturer 
                    || booking.vehicle?.manufacturer 
                    || booking.vehicle_make 
                    || 'Unknown',
                vehicleModel: booking.vehicle?.vehicleSpec?.model 
                    || booking.vehicle?.model 
                    || booking.vehicle_model 
                    || 'Vehicle',
                vehicleYear: booking.vehicle?.vehicleSpec?.year 
                    || booking.vehicle?.year 
                    || booking.vehicle_year 
                    || new Date().getFullYear(),
                pickupDate: booking.booking_date || new Date().toISOString(),
                returnDate: booking.return_date || new Date().toISOString(),
                location: booking.location?.name 
                    || booking.location_name 
                    || 'Unknown Location',
                status: mapBookingStatus(booking.booking_status || 'pending'),
                totalAmount: parseFloat(booking.total_cost || booking.total_amount || '0'),
                image: booking.vehicle?.images?.[0]?.url 
                    || booking.vehicle_image_url 
                    || '/api/placeholder/300/200'
            }));

            setRecentBookings(formattedBookings);
        } catch (err) {
            console.error('Failed to load recent bookings:', err);
            // Set empty array instead of throwing
            setRecentBookings([]);
        }
    };

    const loadNotifications = async () => {
        try {
            const response = await notificationService.getUserNotifications();
            const apiNotifications = response.data?.notifications || [];

            const formattedNotifications: Notification[] = apiNotifications.slice(0, 5).map((notif: any) => ({
                id: notif.notification_id || notif.id,
                type: mapNotificationType(notif.notification_type || notif.type),
                title: notif.title,
                message: notif.message,
                timestamp: notif.created_at,
                read: notif.is_read || false
            }));

            setNotifications(formattedNotifications);
        } catch (err) {
            console.error('Failed to load notifications:', err);
            // Don't throw here, notifications are not critical
            setNotifications([]);
        }
    };

    // Helper function to map booking status
    const mapBookingStatus = (status: string): 'upcoming' | 'active' | 'completed' | 'cancelled' => {
        switch (status?.toLowerCase()) {
            case 'confirmed':
            case 'pending':
                return 'upcoming';
            case 'active':
            case 'in_progress':
                return 'active';
            case 'completed':
                return 'completed';
            case 'cancelled':
                return 'cancelled';
            default:
                return 'upcoming';
        }
    };

    // Helper function to map notification type
    const mapNotificationType = (type: string): 'booking' | 'payment' | 'promotion' | 'reminder' => {
        switch (type?.toLowerCase()) {
            case 'booking_reminder':
            case 'reminder':
                return 'reminder';
            case 'payment_success':
            case 'payment_failed':
            case 'payment':
                return 'payment';
            case 'promotion':
            case 'offer':
                return 'promotion';
            default:
                return 'booking';
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, [currentUser]);

    // Auto-refresh dashboard data every 5 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            loadDashboardData();
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(interval);
    }, []);

    const refreshDashboard = () => {
        loadDashboardData();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'upcoming':
                return 'bg-blue-100 text-blue-800';
            case 'completed':
                return 'bg-gray-100 text-gray-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'booking':
                return Calendar;
            case 'payment':
                return CreditCard;
            case 'promotion':
                return DollarSign;
            case 'reminder':
                return Bell;
            default:
                return Bell;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const statCards = [
        {
            title: 'Total Bookings',
            value: stats.totalBookings,
            icon: Calendar,
            color: 'bg-blue-500',
            change: '+12%',
            changeColor: 'text-green-600'
        },
        {
            title: 'Active Rentals',
            value: stats.activeRentals,
            icon: Car,
            color: 'bg-green-500',
            change: '+1',
            changeColor: 'text-green-600'
        },
        {
            title: 'Total Spent',
            value: `$${stats.totalSpent.toLocaleString()}`,
            icon: DollarSign,
            color: 'bg-purple-500',
            change: '+8%',
            changeColor: 'text-green-600'
        },
        {
            title: 'Loyalty Points',
            value: stats.loyaltyPoints.toLocaleString(),
            icon: Star,
            color: 'bg-yellow-500',
            change: '+125',
            changeColor: 'text-green-600'
        }
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Welcome back, {currentUser?.firstname || 'User'}!
                        </h1>
                        <p className="text-gray-600">
                            Here's what's happening with your rentals today.
                        </p>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={refreshDashboard}
                        disabled={loading}
                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                </div>

                {/* Error State */}
                {error && (
                    <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                            <p className="text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && !error ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-gray-600">Loading your dashboard...</p>
                    </div>
                ) : (
                    <>
                        {/* Quick Actions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <button
                                onClick={() => navigate('/vehicles')}
                                className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left group"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Plus className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                                            Book a Vehicle
                                        </h3>
                                        <p className="text-sm text-gray-600">Find your perfect ride</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => navigate('/dashboard/bookings')}
                                className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left group"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <Calendar className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 group-hover:text-green-600 transition-colors">
                                            My Bookings
                                        </h3>
                                        <p className="text-sm text-gray-600">View all rentals</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => navigate('/dashboard/payments')}
                                className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left group"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <CreditCard className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                            Payments
                                        </h3>
                                        <p className="text-sm text-gray-600">Manage payments</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => navigate('/dashboard/profile')}
                                className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left group"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <Users className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 group-hover:text-purple-600 transition-colors">
                                            Profile
                                        </h3>
                                        <p className="text-sm text-gray-600">Update details</p>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {statCards.map((stat, index) => (
                                <motion.div
                                    key={stat.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                                    className="bg-white rounded-lg shadow-sm p-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 mb-1">
                                                {stat.title}
                                            </p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {stat.value}
                                            </p>
                                            <p className={`text-sm ${stat.changeColor} flex items-center mt-1`}>
                                                <TrendingUp className="w-3 h-3 mr-1" />
                                                {stat.change} from last month
                                            </p>
                                        </div>
                                        <div className={`p-3 rounded-lg ${stat.color}`}>
                                            <stat.icon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Recent Bookings */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-lg shadow-sm">
                                    <div className="p-6 border-b border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-bold text-gray-900">Recent Bookings</h2>
                                            <div className="flex items-center space-x-3">
                                                <select
                                                    value={selectedTimeRange}
                                                    onChange={(e) => setSelectedTimeRange(e.target.value)}
                                                    className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-primary focus:border-transparent"
                                                >
                                                    <option value="7">Last 7 days</option>
                                                    <option value="30">Last 30 days</option>
                                                    <option value="90">Last 3 months</option>
                                                </select>
                                                <button
                                                    onClick={() => navigate('/dashboard/bookings')}
                                                    className="text-primary hover:text-primary-dark text-sm font-medium flex items-center space-x-1"
                                                >
                                                    <span>View All</span>
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        {recentBookings.length > 0 ? (
                                            <div className="space-y-4">
                                                {recentBookings.map((booking) => (
                                                    <motion.div
                                                        key={booking.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                                                        onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}
                                                    >
                                                        <img
                                                            src={booking.image}
                                                            alt={`${booking.vehicleMake} ${booking.vehicleModel}`}
                                                            className="w-16 h-12 object-cover rounded-lg"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h3 className="font-medium text-gray-900">
                                                                    {booking.vehicleYear} {booking.vehicleMake} {booking.vehicleModel}
                                                                </h3>
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                                                                <div className="flex items-center space-x-1">
                                                                    <Calendar className="w-4 h-4" />
                                                                    <span>{formatDate(booking.pickupDate)} - {formatDate(booking.returnDate)}</span>
                                                                </div>
                                                                <div className="flex items-center space-x-1">
                                                                    <MapPin className="w-4 h-4" />
                                                                    <span>{booking.location}</span>
                                                                </div>
                                                                <div className="flex items-center space-x-1">
                                                                    <DollarSign className="w-4 h-4" />
                                                                    <span>${booking.totalAmount}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                                    </motion.div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                                                <p className="text-gray-600 mb-4">Start by booking your first vehicle</p>
                                                <button
                                                    onClick={() => navigate('/vehicles')}
                                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                                                >
                                                    Browse Vehicles
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Notifications & Activity */}
                            <div className="space-y-6">
                                {/* Notifications */}
                                <div className="bg-white rounded-lg shadow-sm">
                                    <div className="p-6 border-b border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
                                            <button className="text-sm text-primary hover:text-primary-dark font-medium">
                                                Mark all read
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        {notifications.length > 0 ? (
                                            <div className="space-y-4">
                                                {notifications.slice(0, 5).map((notification) => {
                                                    const Icon = getNotificationIcon(notification.type);
                                                    return (
                                                        <motion.div
                                                            key={notification.id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ duration: 0.3 }}
                                                            className={`flex items-start space-x-3 p-3 rounded-lg border ${notification.read ? 'border-gray-200' : 'border-primary/20 bg-primary/5'
                                                                }`}
                                                        >
                                                            <div className={`p-2 rounded-lg ${notification.read ? 'bg-gray-100' : 'bg-primary/10'
                                                                }`}>
                                                                <Icon className={`w-4 h-4 ${notification.read ? 'text-gray-600' : 'text-primary'
                                                                    }`} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className="font-medium text-gray-900 text-sm">
                                                                    {notification.title}
                                                                </h4>
                                                                <p className="text-sm text-gray-600 mt-1">
                                                                    {notification.message}
                                                                </p>
                                                                <p className="text-xs text-gray-500 mt-2">
                                                                    {new Date(notification.timestamp).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                            {!notification.read && (
                                                                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                <p className="text-gray-600">No new notifications</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="bg-white rounded-lg shadow-sm p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Activity className="w-4 h-4 text-green-500" />
                                                <span className="text-sm text-gray-600">Money Saved</span>
                                            </div>
                                            <span className="font-medium text-green-600">
                                                ${stats.savedAmount}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Star className="w-4 h-4 text-yellow-500" />
                                                <span className="text-sm text-gray-600">Favorite Vehicles</span>
                                            </div>
                                            <span className="font-medium text-gray-900">
                                                {stats.favoriteVehicles}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Clock className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm text-gray-600">Avg Rental Days</span>
                                            </div>
                                            <span className="font-medium text-gray-900">4.2</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Loyalty Program */}
                                <div className="bg-gradient-to-r from-primary to-primary-dark rounded-lg p-6 text-white">
                                    <h3 className="text-lg font-bold mb-2">Loyalty Program</h3>
                                    <p className="text-primary-light mb-4">
                                        You have {stats.loyaltyPoints} points
                                    </p>
                                    <div className="bg-white/20 rounded-full h-2 mb-4">
                                        <div
                                            className="bg-white rounded-full h-2 transition-all duration-300"
                                            style={{ width: `${(stats.loyaltyPoints % 1000) / 10}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-sm text-primary-light">
                                        {1000 - (stats.loyaltyPoints % 1000)} points to next reward
                                    </p>
                                    <button className="mt-3 px-4 py-2 bg-white text-primary rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                                        View Rewards
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;
