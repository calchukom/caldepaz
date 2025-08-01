import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Search,
    Heart,
    Car,
    AlertCircle,
    MapPin,
    Fuel,
    Users,
    Gauge,
    Star
} from 'lucide-react';

import favoritesService from '../../services/favoritesService';
import { Vehicle } from '../../types/vehicle';
import { formatCurrency } from '../../utils/number';
import FavoriteButton from '../../components/common/FavoriteButton';

const FavoritesPage: React.FC = () => {
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch user's favorite vehicles
    const fetchFavorites = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await favoritesService.getFavorites();

            if (response.success && response.data) {
                setFavorites(response.data);
            } else {
                setError(response.message || 'Failed to load favorite vehicles');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching favorite vehicles');
            toast.error('Failed to load your favorite vehicles. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchFavorites();
    }, []);

    // Navigate to vehicle detail page
    const handleViewVehicle = (vehicleId: string) => {
        navigate(`/vehicles/${vehicleId}`);
    };

    // Navigate to booking page for a vehicle
    const handleBookVehicle = (vehicleId: string) => {
        navigate(`/booking/${vehicleId}`);
    };

    // Filter favorites by search query
    const filteredFavorites = favorites.filter(vehicle => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        const manufacturer = vehicle.vehicleSpec?.manufacturer?.toLowerCase() || '';
        const model = vehicle.vehicleSpec?.model?.toLowerCase() || '';
        const category = vehicle.vehicleSpec?.vehicle_category?.toLowerCase() || '';
        const licensePlate = vehicle.license_plate?.toLowerCase() || '';

        return (
            manufacturer.includes(query) ||
            model.includes(query) ||
            category.includes(query) ||
            licensePlate.includes(query)
        );
    });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Favorite Vehicles</h1>
                <p className="text-gray-600">Manage your saved vehicles for quick access</p>
            </div>

            {/* Search Bar */}
            <div className="mb-8">
                <div className="relative max-w-md">
                    <input
                        type="text"
                        placeholder="Search your favorites..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
            </div>

            {/* Favorites List */}
            <div className="space-y-6">
                {loading ? (
                    // Loading state
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-gray-600">Loading your favorite vehicles...</p>
                    </div>
                ) : error ? (
                    // Error state
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                        <h3 className="text-lg font-medium text-red-800 mb-2">Failed to load favorites</h3>
                        <p className="text-red-600">{error}</p>
                        <button
                            onClick={fetchFavorites}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : filteredFavorites.length === 0 ? (
                    // Empty state
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                        <Heart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-xl font-medium text-gray-800 mb-2">No favorite vehicles yet</h3>
                        <p className="text-gray-600 mb-6">
                            {searchQuery
                                ? "No vehicles match your search criteria."
                                : "Start adding vehicles to your favorites while browsing our collection."}
                        </p>
                        <button
                            onClick={() => navigate('/vehicles')}
                            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                        >
                            Browse Vehicles
                        </button>
                    </div>
                ) : (
                    // Favorites grid
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredFavorites.map((vehicle) => (
                            <div
                                key={vehicle.vehicle_id}
                                className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
                            >
                                {/* Vehicle Image */}
                                <div className="relative h-48 w-full bg-gray-200">
                                    {vehicle.images && vehicle.images.length > 0 ? (
                                        <img
                                            src={vehicle.images[0].url}
                                            alt={`${vehicle.vehicleSpec?.manufacturer} ${vehicle.vehicleSpec?.model}`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                            <Car className="w-16 h-16 text-gray-400" />
                                        </div>
                                    )}

                                    {/* Favorite Button */}
                                    <div className="absolute top-2 right-2">
                                        <FavoriteButton
                                            vehicleId={vehicle.vehicle_id}
                                            size="md"
                                        />
                                    </div>

                                    {/* Status Badge */}
                                    {!vehicle.availability && (
                                        <div className="absolute bottom-2 right-2 bg-red-500 text-white text-xs font-bold uppercase px-2 py-1 rounded">
                                            Not Available
                                        </div>
                                    )}
                                </div>

                                {/* Vehicle Info */}
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-gray-900 truncate">
                                            {vehicle.vehicleSpec?.manufacturer} {vehicle.vehicleSpec?.model}
                                        </h3>
                                        <div className="flex items-center text-yellow-500">
                                            <Star className="w-4 h-4 fill-current" />
                                            <span className="ml-1 text-sm font-medium">4.8</span>
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-600 mb-4">
                                        {vehicle.vehicleSpec?.year} • {vehicle.vehicleSpec?.vehicle_category}
                                    </p>

                                    {/* Features */}
                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        <div className="flex items-center text-gray-600 text-sm">
                                            <Users className="w-4 h-4 mr-1" />
                                            <span>{vehicle.vehicleSpec?.seating_capacity} seats</span>
                                        </div>
                                        <div className="flex items-center text-gray-600 text-sm">
                                            <Gauge className="w-4 h-4 mr-1" />
                                            <span>{vehicle.vehicleSpec?.transmission || 'Auto'}</span>
                                        </div>
                                        <div className="flex items-center text-gray-600 text-sm">
                                            <Fuel className="w-4 h-4 mr-1" />
                                            <span>{vehicle.vehicleSpec?.fuel_type}</span>
                                        </div>
                                        <div className="flex items-center text-gray-600 text-sm">
                                            <MapPin className="w-4 h-4 mr-1" />
                                            <span>{vehicle.location?.name || 'N/A'}</span>
                                        </div>
                                    </div>

                                    {/* Price & Actions */}
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                        <div>
                                            <p className="text-primary font-bold text-lg">
                                                {formatCurrency(parseFloat(vehicle.rental_rate))}
                                                <span className="text-gray-500 text-sm font-normal"> / day</span>
                                            </p>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleViewVehicle(vehicle.vehicle_id)}
                                                className="px-3 py-1.5 border border-primary text-primary rounded-md hover:bg-primary hover:text-white transition-colors text-sm"
                                            >
                                                Details
                                            </button>

                                            <button
                                                onClick={() => handleBookVehicle(vehicle.vehicle_id)}
                                                disabled={!vehicle.availability}
                                                className={`px-3 py-1.5 bg-primary text-white rounded-md text-sm transition-colors ${vehicle.availability
                                                    ? 'hover:bg-primary-dark'
                                                    : 'opacity-50 cursor-not-allowed'
                                                    }`}
                                            >
                                                Book Now
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FavoritesPage;