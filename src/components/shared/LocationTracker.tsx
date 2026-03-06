import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navigation, Clock, User, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notification.service';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';

// Google Maps configuration
const mapContainerStyle = {
  width: '100%',
  height: '256px'
};

const defaultCenter = {
  lat: 6.5244,
  lng: 3.3792
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

// Map Component with Google Maps
interface DeliveryMapProps {
    customerLocation: LocationData | null;
    agentLocation: LocationData | null;
}

const DeliveryMap: React.FC<DeliveryMapProps> = ({ customerLocation, agentLocation }) => {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: 'AIzaSyBb8LPZ3bX5MPFSiUj90iyAjCwvWJnzjz0'
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedMarker, setSelectedMarker] = useState<'customer' | 'agent' | null>(null);

    const onLoad = useCallback((map: google.maps.Map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    // Fit bounds when locations change
    useEffect(() => {
        if (!map || !isLoaded) return;

        const bounds = new google.maps.LatLngBounds();
        let hasPoints = false;

        if (customerLocation) {
            bounds.extend({ lat: customerLocation.latitude, lng: customerLocation.longitude });
            hasPoints = true;
        }
        if (agentLocation) {
            bounds.extend({ lat: agentLocation.latitude, lng: agentLocation.longitude });
            hasPoints = true;
        }

        if (hasPoints) {
            map.fitBounds(bounds, { padding: 50 });
        }
    }, [map, customerLocation, agentLocation, isLoaded]);

    if (loadError) {
        return (
            <div className="w-full flex items-center justify-center bg-gray-100" style={{ height: '256px' }}>
                <p className="text-gray-500">Error loading maps</p>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="w-full flex items-center justify-center bg-gray-100" style={{ height: '256px' }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-500 text-sm">Loading map...</p>
                </div>
            </div>
        );
    }

    return (
        <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={13}
            options={mapOptions}
            onLoad={onLoad}
            onUnmount={onUnmount}
        >
            {/* Customer Marker */}
            {customerLocation && (
                <Marker
                    position={{ lat: customerLocation.latitude, lng: customerLocation.longitude }}
                    title="Customer Location"
                    onClick={() => setSelectedMarker('customer')}
                    icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: '#3B82F6',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3
                    }}
                />
            )}

            {/* Agent Marker */}
            {agentLocation && (
                <Marker
                    position={{ lat: agentLocation.latitude, lng: agentLocation.longitude }}
                    title="Delivery Agent"
                    onClick={() => setSelectedMarker('agent')}
                    icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: '#22C55E',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3
                    }}
                />
            )}

            {/* Route Line */}
            {customerLocation && agentLocation && (
                <Polyline
                    path={[
                        { lat: agentLocation.latitude, lng: agentLocation.longitude },
                        { lat: customerLocation.latitude, lng: customerLocation.longitude }
                    ]}
                    options={{
                        strokeColor: '#3B82F6',
                        strokeOpacity: 0.7,
                        strokeWeight: 4,
                        geodesic: true
                    }}
                />
            )}
        </GoogleMap>
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

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const estimateEta = (dist: number): string => {
        if (dist <= 0) return 'Arriving soon';
        const timeInMinutes = Math.round((dist / 30) * 60);
        return timeInMinutes > 0 ? `${timeInMinutes} min` : 'Arriving soon';
    };

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
            } finally {
                setLoading(false);
            }
        };

        fetchLocationData();

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

    const updateDeliveryAgentLocation = async () => {
        if (!profile || !profile.id) return;

        if (!navigator.geolocation) {
            setError('Geolocation is not supported');
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
                    .update({ delivery_agent_location: locationData })
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
                        console.error('Error sending notification:', notificationError);
                    }
                }

                if (error) {
                    setError('Failed to update location');
                }
            },
            (err) => {
                setError(`Unable to get location: ${err.message}`);
            }
        );
    };

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
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <h2 className="text-xl font-bold text-gray-900">Order Tracking</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mx-6 mt-4 flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center">
                        <Clock className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-blue-800">Status: {currentStatus}</span>
                    </div>
                    {distance !== null && (
                        <div className="text-sm font-medium text-blue-800">{distance} km away</div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
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
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">Location not available</p>
                            )}
                        </div>

                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <DeliveryMap
                                customerLocation={customerLocation}
                                agentLocation={deliveryAgentLocation}
                            />
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
