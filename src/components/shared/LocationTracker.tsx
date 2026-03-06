import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Navigation, Clock, User, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notification.service';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with webpack/bundlers
const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

// Delivery Map Component using Leaflet
interface DeliveryMapProps {
    customerLocation: LocationData | null;
    agentLocation: LocationData | null;
}

const DeliveryMap: React.FC<DeliveryMapProps> = ({ customerLocation, agentLocation }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const customerMarkerRef = useRef<L.Marker | null>(null);
    const agentMarkerRef = useRef<L.Marker | null>(null);
    const routeLineRef = useRef<L.Polyline | null>(null);

    // Initialize map
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // Default center (can be updated)
        const defaultCenter: [number, number] = [6.5244, 3.3792]; // Lagos, Nigeria

        const map = L.map(mapRef.current, {
            zoomControl: true,
            dragging: true,
            scrollWheelZoom: true
        }).setView(defaultCenter, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        mapInstanceRef.current = map;

        // Fix: Invalidate map size after container is visible (for modal/popup layouts)
        // Multiple attempts to ensure Leaflet calculates dimensions correctly
        const invalidateMapSize = () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        };

        // Immediate invalidation
        setTimeout(invalidateMapSize, 100);
        // Delayed invalidation for CSS transitions
        setTimeout(invalidateMapSize, 300);
        // Additional invalidation for slow-loading modals
        setTimeout(invalidateMapSize, 500);

        // Set explicit container dimensions to prevent squished map
        if (mapRef.current) {
            mapRef.current.style.width = '100%';
            mapRef.current.style.height = '256px';
            mapRef.current.style.minHeight = '256px';
        }

        // Use ResizeObserver to handle dynamic container resizing
        const resizeObserver = new ResizeObserver(() => {
            invalidateMapSize();
        });
        if (mapRef.current) {
            resizeObserver.observe(mapRef.current);
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            resizeObserver.disconnect();
        };
    }, []);

    // Update markers and route when locations change
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        const map = mapInstanceRef.current;

        // Remove existing markers
        if (customerMarkerRef.current) {
            map.removeLayer(customerMarkerRef.current);
            customerMarkerRef.current = null;
        }
        if (agentMarkerRef.current) {
            map.removeLayer(agentMarkerRef.current);
            agentMarkerRef.current = null;
        }
        if (routeLineRef.current) {
            map.removeLayer(routeLineRef.current);
            routeLineRef.current = null;
        }

        const bounds: L.LatLngTuple[] = [];

        // Add customer marker (blue)
        if (customerLocation) {
            const customerIcon = L.divIcon({
                className: 'custom-marker',
                html: '<div style="background-color: #3B82F6; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            const customerLatLng: L.LatLngTuple = [customerLocation.latitude, customerLocation.longitude];
            customerMarkerRef.current = L.marker(customerLatLng, { icon: customerIcon })
                .addTo(map)
                .bindPopup('<b>Customer Location</b><br>Delivery destination');
            bounds.push(customerLatLng);
        }

        // Add agent marker (green)
        if (agentLocation) {
            const agentIcon = L.divIcon({
                className: 'custom-marker',
                html: '<div style="background-color: #22C55E; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            const agentLatLng: L.LatLngTuple = [agentLocation.latitude, agentLocation.longitude];
            agentMarkerRef.current = L.marker(agentLatLng, { icon: agentIcon })
                .addTo(map)
                .bindPopup('<b>Delivery Agent</b><br>Current location');
            bounds.push(agentLatLng);
        }

        // Draw route line between agent and customer
        if (customerLocation && agentLocation) {
            const routeLine = L.polyline(
                [
                    [agentLocation.latitude, agentLocation.longitude] as L.LatLngTuple,
                    [customerLocation.latitude, customerLocation.longitude] as L.LatLngTuple
                ],
                {
                    color: '#3B82F6',
                    weight: 4,
                    opacity: 0.7,
                    dashArray: '10, 10'
                }
            ).addTo(map);
            routeLineRef.current = routeLine;
        }

        // Fit map to show all markers
        if (bounds.length > 0) {
            if (bounds.length === 1) {
                map.setView(bounds[0], 15);
            } else {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [customerLocation, agentLocation]);

    return (
        <div
            ref={mapRef}
            className="h-64 w-full"
            style={{ minHeight: '256px' }}
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