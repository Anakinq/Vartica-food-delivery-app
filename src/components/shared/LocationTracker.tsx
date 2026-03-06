import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock, User, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notification.service';

// Simple Delivery Map Component - shows location info without external map API
interface DeliveryMapProps {
    customerLocation: LocationData | null;
    agentLocation: LocationData | null;
}

const DeliveryMap: React.FC<DeliveryMapProps> = ({ customerLocation, agentLocation }) => {
    const hasCustomer = !!customerLocation;
    const hasAgent = !!agentLocation;
    
    return (
        <div
            className="w-full"
            style={{ height: '240px', minHeight: '240px' }}
        >
            {/* Map Preview - Simple visual without external API */}
            <div className="h-full w-full bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex flex-col p-4">
                {/* Map area with markers */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-4 w-full max-w-xs">
                        {/* Customer marker */}
                        <div className="flex flex-col items-center flex-1">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${hasCustomer ? 'bg-blue-500' : 'bg-gray-300'}`}>
                                <User className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xs mt-2 font-medium text-gray-700">Customer</span>
                            {customerLocation ? (
                                <span className="text-xs text-green-600 mt-1">✓ Located</span>
                            ) : (
                                <span className="text-xs text-gray-400 mt-1">Waiting...</span>
                            )}
                        </div>
                        
                        {/* Connection line */}
                        <div className="flex-1 h-2 bg-gradient-to-r from-blue-500 to-green-500 rounded-full"></div>
                        
                        {/* Agent marker */}
                        <div className="flex flex-col items-center flex-1">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${hasAgent ? 'bg-green-500' : 'bg-gray-300'}`}>
                                <Navigation className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xs mt-2 font-medium text-gray-700">Driver</span>
                            {agentLocation ? (
                                <span className="text-xs text-green-600 mt-1">✓ Active</span>
                            ) : (
                                <span className="text-xs text-gray-400 mt-1">Waiting...</span>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Location details */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/80 rounded p-2">
                        <div className="font-medium text-gray-700">Customer:</div>
                        {customerLocation ? (
                            <div className="text-gray-600">
                                {customerLocation.latitude.toFixed(4)}, {customerLocation.longitude.toFixed(4)}
                            </div>
                        ) : (
                            <div className="text-gray-400">No location data</div>
                        )}
                    </div>
                    <div className="bg-white/80 rounded p-2">
                        <div className="font-medium text-gray-700">Driver:</div>
                        {agentLocation ? (
                            <div className="text-gray-600">
                                {agentLocation.latitude.toFixed(4)}, {agentLocation.longitude.toFixed(4)}
                            </div>
                        ) : (
                            <div className="text-gray-400">No location data</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

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
    const [currentStatus, setCurrentStatus] = useState<string>(orderStatus);
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
        const timeInHours = dist / 30;
        const timeInMinutes = Math.round(timeInHours * 60);
        return timeInMinutes > 0 ? `${timeInMinutes} min` : 'Arriving soon';
    };

    // Fetch initial location data
    useEffect(() => {
        const fetchLocationData = async () => {
            try {
                const { data: orderData, error } = await supabase
                    .from('orders')
                    .select('customer_location, delivery_agent_location, status, user_id')
                    .eq('id', orderId)
                    .single();

                if (error) throw error;

                if (orderData?.status) {
                    setCurrentStatus(orderData.status);
                }

                if (orderData?.customer_location) {
                    setCustomerLocation(orderData.customer_location);
                }

                if (orderData?.delivery_agent_location) {
                    setDeliveryAgentLocation(orderData.delivery_agent_location);

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
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                setError(`Failed to load location data: ${errorMessage}`);
                console.error('Location fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLocationData();

        // Subscribe to real-time location and status updates
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
                (payload: any) => {
                    if (payload.new.status) {
                        setCurrentStatus(payload.new.status);
                    }
                    if (payload.new.customer_location) {
                        setCustomerLocation(payload.new.customer_location);
                    }
                    if (payload.new.delivery_agent_location) {
                        setDeliveryAgentLocation(payload.new.delivery_agent_location);

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

                if (!error) {
                    try {
                        const { data: orderData } = await supabase
                            .from('orders')
                            .select('user_id, seller_id, seller_type, order_number')
                            .eq('id', orderId)
                            .single();

                        if (orderData) {
                            await notificationService.sendOrderStatusUpdate(orderData.order_number, orderData.user_id, 'picked_up');

                            if (orderData.seller_id && orderData.seller_type === 'vendor') {
                                await notificationService.sendOrderStatusUpdate(orderData.order_number, orderData.seller_id, 'picked_up');
                            }
                        }
                    } catch (notificationError) {
                        console.error('Error sending location update notification:', notificationError);
                    }
                }

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
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                            title="Back"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <h2 className="text-xl font-bold text-gray-900">Order Tracking</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Status Bar */}
                <div className="mx-6 mt-4 flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center">
                        <Clock className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-blue-800">Status: {currentStatus}</span>
                    </div>
                    {distance !== null && (
                        <div className="text-sm font-medium text-blue-800">
                            {distance} km away
                        </div>
                    )}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
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

                        {/* Map Preview */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <DeliveryMap
                                customerLocation={customerLocation}
                                agentLocation={deliveryAgentLocation}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
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
