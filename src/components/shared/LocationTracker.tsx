import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface LocationTrackerProps {
    orderId: string;
    orderStatus: string;
    onClose: () => void;
}

interface LocationData {
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy?: number;
}

export const LocationTracker: React.FC<LocationTrackerProps> = ({
    orderId,
    orderStatus,
    onClose
}) => {
    const { profile } = useAuth();
    const [customerLocation, setCustomerLocation] = useState<LocationData | null>(null);
    const [deliveryAgentLocation, setDeliveryAgentLocation] = useState<LocationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [eta, setEta] = useState<string | null>(null);
    const channelRef = useRef<any>(null);

    // Calculate distance between two points using Haversine formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    // Estimate ETA based on distance and average speed (30 km/h)
    const estimateEta = (dist: number): string => {
        if (dist <= 0) return 'Arriving soon';
        const timeInHours = dist / 30; // Average speed 30 km/h
        const timeInMinutes = Math.round(timeInHours * 60);
        return timeInMinutes > 0 ? `${timeInMinutes} min` : 'Arriving soon';
    };

    // Fetch initial location data
    useEffect(() => {
        const fetchLocationData = async () => {
            try {
                const { data: orderData, error } = await supabase
                    .from('orders')
                    .select('customer_location, delivery_agent_location')
                    .eq('id', orderId)
                    .single();

                if (error) throw error;

                if (orderData?.customer_location) {
                    setCustomerLocation(orderData.customer_location);
                }
                if (orderData?.delivery_agent_location) {
                    setDeliveryAgentLocation(orderData.delivery_agent_location);

                    // Calculate distance and ETA if both locations are available
                    if (orderData.customer_location && orderData.delivery_agent_location) {
                        const dist = calculateDistance(
                            orderData.delivery_agent_location.latitude,
                            orderData.delivery_agent_location.longitude,
                            orderData.customer_location.latitude,
                            orderData.customer_location.longitude
                        );
                        setDistance(parseFloat(dist.toFixed(2)));
                        setEta(estimateEta(dist));
                    }
                }
            } catch (err) {
                setError('Failed to load location data');
                console.error('Location fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLocationData();

        // Subscribe to real-time location updates
        channelRef.current = supabase
            .channel(`order-location-${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${orderId}`,
                },
                (payload) => {
                    if (payload.new.customer_location) {
                        setCustomerLocation(payload.new.customer_location);
                    }
                    if (payload.new.delivery_agent_location) {
                        setDeliveryAgentLocation(payload.new.delivery_agent_location);

                        // Recalculate distance and ETA
                        if (payload.new.customer_location && payload.new.delivery_agent_location) {
                            const dist = calculateDistance(
                                payload.new.delivery_agent_location.latitude,
                                payload.new.delivery_agent_location.longitude,
                                payload.new.customer_location.latitude,
                                payload.new.customer_location.longitude
                            );
                            setDistance(parseFloat(dist.toFixed(2)));
                            setEta(estimateEta(dist));
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [orderId]);

    // Update delivery agent location
    const updateDeliveryAgentLocation = async () => {
        if (!profile || !profile.id) return;

        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const locationData: LocationData = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    timestamp: new Date().toISOString(),
                    accuracy: position.coords.accuracy
                };

                const { error } = await supabase
                    .from('orders')
                    .update({
                        delivery_agent_location: locationData
                    })
                    .eq('id', orderId)
                    .eq('delivery_agent_id', profile.id);

                if (error) {
                    setError('Failed to update location');
                    console.error('Location update error:', error);
                }
            },
            (err) => {
                setError(`Unable to retrieve your location: ${err.message}`);
            }
        );
    };

    // Update location every 30 seconds if user is a delivery agent
    useEffect(() => {
        if (profile?.role === 'delivery_agent') {
            const interval = setInterval(updateDeliveryAgentLocation, 30000);
            return () => clearInterval(interval);
        }
    }, [profile?.role, orderId]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading location data...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900">Order Tracking</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center">
                            <Clock className="h-4 w-4 text-blue-600 mr-2" />
                            <span className="text-sm font-medium text-blue-800">Status: {orderStatus}</span>
                        </div>
                        {distance !== null && (
                            <div className="text-sm font-medium text-blue-800">
                                {distance} km away
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-96">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {eta && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center">
                                <Clock className="h-5 w-5 text-green-600 mr-2" />
                                <span className="font-medium text-green-800">Estimated Arrival: {eta}</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Customer Location */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center mb-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                    <User className="h-4 w-4 text-blue-600" />
                                </div>
                                <h3 className="font-medium text-gray-900">Customer Location</h3>
                            </div>

                            {customerLocation ? (
                                <div className="text-sm text-gray-600">
                                    <p>Lat: {customerLocation.latitude.toFixed(6)}</p>
                                    <p>Lng: {customerLocation.longitude.toFixed(6)}</p>
                                    <p>Updated: {new Date(customerLocation.timestamp).toLocaleTimeString()}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">Location not available</p>
                            )}
                        </div>

                        {/* Delivery Agent Location */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center mb-3">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                    <Navigation className="h-4 w-4 text-green-600" />
                                </div>
                                <h3 className="font-medium text-gray-900">Delivery Agent Location</h3>
                            </div>

                            {deliveryAgentLocation ? (
                                <div className="text-sm text-gray-600">
                                    <p>Lat: {deliveryAgentLocation.latitude.toFixed(6)}</p>
                                    <p>Lng: {deliveryAgentLocation.longitude.toFixed(6)}</p>
                                    <p>Updated: {new Date(deliveryAgentLocation.timestamp).toLocaleTimeString()}</p>
                                    {deliveryAgentLocation.accuracy && (
                                        <p>Accuracy: ±{Math.round(deliveryAgentLocation.accuracy)}m</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">Location not available</p>
                            )}
                        </div>

                        {/* Map Preview (Placeholder) */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-100 h-48 flex items-center justify-center">
                                <div className="text-center">
                                    <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">Interactive Map Preview</p>
                                    <p className="text-gray-400 text-xs mt-1">Delivery route visualization</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-200">
                    <div className="flex space-x-3">
                        <button
                            onClick={updateDeliveryAgentLocation}
                            disabled={profile?.role !== 'delivery_agent'}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium ${profile?.role === 'delivery_agent'
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {profile?.role === 'delivery_agent' ? 'Update Location' : 'Delivery Only'}
                        </button>

                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};