import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Navigation, Clock, User, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notification.service';

// Delivery Map Component using Google Maps
interface DeliveryMapProps {
    customerLocation: LocationData | null;
    agentLocation: LocationData | null;
}

const DeliveryMap: React.FC<DeliveryMapProps> = ({ customerLocation, agentLocation }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const customerMarkerRef = useRef<google.maps.Marker | null>(null);
    const agentMarkerRef = useRef<google.maps.Marker | null>(null);
    const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

    // Initialize Google Map
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // Check if Google Maps is loaded
        if (typeof google === 'undefined' || !google.maps) {
            console.error('Google Maps API not loaded');
            return;
        }

        // Default center (Lagos, Nigeria)
        const defaultCenter = { lat: 6.5244, lng: 3.3792 };

        const map = new google.maps.Map(mapRef.current, {
            center: defaultCenter,
            zoom: 13,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        });

        mapInstanceRef.current = map;

        // Initialize DirectionsRenderer for route
        const directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#3B82F6',
                strokeWeight: 4,
                strokeOpacity: 0.7
            }
        });
        directionsRenderer.setMap(map);
        directionsRendererRef.current = directionsRenderer;

        // Set explicit dimensions
        if (mapRef.current) {
            mapRef.current.style.width = '100%';
            mapRef.current.style.height = '256px';
            mapRef.current.style.minHeight = '256px';
        }

        return () => {
            mapInstanceRef.current = null;
            directionsRendererRef.current = null;
        };
    }, []);

    // Update markers and route when locations change
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        const map = mapInstanceRef.current;

        // Remove existing markers
        if (customerMarkerRef.current) {
            customerMarkerRef.current.setMap(null);
            customerMarkerRef.current = null;
        }
        if (agentMarkerRef.current) {
            agentMarkerRef.current.setMap(null);
            agentMarkerRef.current = null;
        }

        const bounds = new google.maps.LatLngBounds();
        let hasMarkers = false;

        // Add customer marker (blue)
        if (customerLocation) {
            const customerPos = { lat: customerLocation.latitude, lng: customerLocation.longitude };

            const customerMarker = new google.maps.Marker({
                position: customerPos,
                map: map,
                title: 'Customer Location',
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: '#3B82F6',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3
                }
            });

            customerMarkerRef.current = customerMarker;
            bounds.extend(customerPos);
            hasMarkers = true;
        }

        // Add agent marker (green)
        if (agentLocation) {
            const agentPos = { lat: agentLocation.latitude, lng: agentLocation.longitude };

            const agentMarker = new google.maps.Marker({
                position: agentPos,
                map: map,
                title: 'Delivery Agent',
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: '#22C55E',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3
                }
            });

            agentMarkerRef.current = agentMarker;
            bounds.extend(agentPos);
            hasMarkers = true;
        }

        // Fit map to show all markers
        if (hasMarkers) {
            map.fitBounds(bounds, { padding: 50 });
        }

        // Draw route between agent and customer
        if (customerLocation && agentLocation && directionsRendererRef.current) {
            const directionsService = new google.maps.DirectionsService();
            const origin = { lat: agentLocation.latitude, lng: agentLocation.longitude };
            const destination = { lat: customerLocation.latitude, lng: customerLocation.longitude };

            directionsService.route(
                {
                    origin: origin,
                    destination: destination,
                    travelMode: google.maps.TravelMode.DRIVING
                },
                (result, status) => {
                    if (status === google.maps.DirectionsStatus.OK && result) {
                        directionsRendererRef.current?.setDirections(result);
                    }
                }
            );
        }
    }, [customerLocation, agentLocation]);

    return (
        <div
            ref={mapRef}
            className="w-full"
            style={{ height: '256px', minHeight: '256px' }}
        />
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
    // Fix Issue 3: Use database status instead of prop for consistency
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
        const timeInHours = dist / 30; // Average speed 30 km/h
        const timeInMinutes = Math.round(timeInHours * 60);
        return timeInMinutes > 0 ? `${timeInMinutes} min` : 'Arriving soon';
    };

    // Fetch initial location data
    useEffect(() => {
        const fetchLocationData = async () => {
            try {
                // Fix Issue 2 & 3: Fetch status and location from database
                const { data: orderData, error } = await supabase
                    .from('orders')
                    .select('customer_location, delivery_agent_location, status, user_id')
                    .eq('id', orderId)
                    .single();

                if (error) throw error;

                // Fix Issue 3: Use database status for consistency
                if (orderData?.status) {
                    setCurrentStatus(orderData.status);
                }

                if (orderData?.customer_location) {
                    setCustomerLocation(orderData.customer_location);
                } else if (orderData?.user_id) {
                    // Fix Issue 2: Fallback - try to get location from user profile
                    try {
                        const { data: profileData } = await supabase
                            .from('profiles')
                            .select('latitude, longitude')
                            .eq('id', orderData.user_id)
                            .single();

                        if (profileData?.latitude && profileData?.longitude) {
                            setCustomerLocation({
                                latitude: profileData.latitude,
                                longitude: profileData.longitude,
                                timestamp: new Date().toISOString()
                            });
                        }
                    } catch (profileErr) {
                        console.warn('Could not fetch customer profile location:', profileErr);
                    }
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
                // Fix Issue 2: More specific error message
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
                    // Fix Issue 3: Update status in real-time when database changes
                    if (payload.new.status) {
                        setCurrentStatus(payload.new.status);
                    }
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

                // Send notification about location update
                if (!error) {
                    try {
                        // Fetch order details to get customer and seller IDs
                        const { data: orderData, error: orderError } = await supabase
                            .from('orders')
                            .select('user_id, seller_id, seller_type, order_number')
                            .eq('id', orderId)
                            .single();

                        if (orderData) {
                            // Send notification to customer about delivery progress
                            await notificationService.sendOrderStatusUpdate(orderData.order_number, orderData.user_id, 'picked_up');

                            // Send notification to vendor ONLY (not cafeteria)
                            if (orderData.seller_id && orderData.seller_type === 'vendor') {
                                await notificationService.sendOrderStatusUpdate(orderData.order_number, orderData.seller_id, 'picked_up');
                            }
                        }
                    } catch (notificationError) {
                        console.error('Error sending location update notification:', notificationError);
                        // Don't fail the location update if notification fails
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

                        {/* Map Preview with Leaflet */}
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