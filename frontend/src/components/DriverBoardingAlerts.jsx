import React, { useEffect, useState, useRef } from 'react';
import { MapPin, Clock, Navigation, X, CheckCircle } from 'lucide-react';
import { driverAlertSound } from '../utils/driverAlertSound';

/**
 * DriverBoardingAlerts Component
 * 
 * Real-time passenger boarding notification system for bus drivers.
 * 
 * Features:
 * - Connects to Socket.IO server when driver logs in
 * - Joins a private room keyed to the driver's busId
 * - Receives passenger_boarding events with road distance, travel time, and stop count
 * - Plays multi-layered Web Audio API alert sound (3 overlapping tones)
 * - Displays notification cards with yellow border and pulsing "NEW" badge
 * - Shows unacknowledged alert count
 * - Allows driver to acknowledge and dismiss notifications
 * 
 * Required: Install socket.io-client
 * npm install socket.io-client
 * 
 * @param {string} busId - The MongoDB ObjectId of the bus the driver is operating
 */

export default function DriverBoardingAlerts({ busId }) {
    const [notifications, setNotifications] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const audioInitialized = useRef(false);

    // Socket.IO connection setup
    useEffect(() => {
        if (!busId) {
            console.warn('⚠️  No busId provided to DriverBoardingAlerts');
            return;
        }

        // Initialize audio context on first user interaction
        const initAudio = () => {
            if (!audioInitialized.current) {
                driverAlertSound.initialize();
                audioInitialized.current = true;
                console.log('🔊 Audio initialized on user interaction');
            }
        };

        // Add click listener to initialize audio (browser requires user gesture)
        document.addEventListener('click', initAudio, { once: true });

        // Import socket.io-client dynamically
        import('socket.io-client').then(({ io }) => {
            // Connect to backend Socket.IO server
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
            const socketInstance = io(BACKEND_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });

            // Connection successful
            socketInstance.on('connect', () => {
                console.log('🔌 Socket.IO connected:', socketInstance.id);
                setIsConnected(true);

                // Join the driver's private room
                socketInstance.emit('driver_join', { busId });
                console.log(`📡 Sent driver_join event for bus: ${busId}`);
            });

            // Confirmation that driver joined room
            socketInstance.on('driver_joined', (data) => {
                console.log('✅ Driver successfully joined room:', data);
            });

            // Listen for passenger boarding notifications
            socketInstance.on('passenger_boarding', (payload) => {
                console.log('🚏 Passenger boarding notification received:', payload);

                // Play multi-layered alert sound
                try {
                    driverAlertSound.playAlert();
                } catch (error) {
                    console.error('❌ Failed to play alert sound:', error);
                }

                // Add notification to state
                setNotifications((prev) => [
                    {
                        id: `notif-${Date.now()}-${Math.random()}`,
                        ...payload,
                        isNew: true
                    },
                    ...prev
                ]);

                // Remove "NEW" badge after 3 seconds
                setTimeout(() => {
                    setNotifications((prev) =>
                        prev.map((notif) =>
                            notif.timestamp === payload.timestamp
                                ? { ...notif, isNew: false }
                                : notif
                        )
                    );
                }, 3000);
            });

            // Disconnection
            socketInstance.on('disconnect', () => {
                console.log('🔌 Socket.IO disconnected');
                setIsConnected(false);
            });

            // Connection error
            socketInstance.on('connect_error', (error) => {
                console.error('❌ Socket.IO connection error:', error);
                setIsConnected(false);
            });

            setSocket(socketInstance);

            // Cleanup on unmount
            return () => {
                socketInstance.disconnect();
                document.removeEventListener('click', initAudio);
            };
        }).catch((error) => {
            console.error('❌ Failed to load socket.io-client:', error);
            console.error('💡 Install with: npm install socket.io-client');
        });

    }, [busId]);

    // Acknowledge notification
    const handleAcknowledge = (notificationId) => {
        setNotifications((prev) =>
            prev.filter((notif) => notif.id !== notificationId)
        );
    };

    // Expand/collapse notification to show full GPS coordinates
    const [expandedId, setExpandedId] = useState(null);

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    // Calculate unacknowledged count
    const unacknowledgedCount = notifications.filter((n) => n.status === 'unacknowledged').length;

    return (
        <div className="driver-boarding-alerts">
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-gray-700">
                    {isConnected ? 'Connected - Monitoring for passengers' : 'Disconnected'}
                </span>
                {unacknowledgedCount > 0 && (
                    <span className="ml-auto bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {unacknowledgedCount} new
                    </span>
                )}
            </div>

            {/* Notification Cards */}
            <div className="space-y-3">
                {notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No passenger boarding requests yet</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${
                                notif.isNew
                                    ? 'border-yellow-400 bg-yellow-50 shadow-lg'
                                    : 'border-gray-300 bg-white'
                            }`}
                        >
                            {/* NEW Badge */}
                            {notif.isNew && (
                                <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                                    NEW
                                </div>
                            )}

                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-semibold text-gray-800">
                                        Passenger Boarding Request
                                    </h3>
                                </div>
                                <button
                                    onClick={() => handleAcknowledge(notif.id)}
                                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                    title="Mark as acknowledged"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    OK
                                </button>
                            </div>

                            {/* Key Information Grid */}
                            <div className="grid grid-cols-3 gap-4 mb-3">
                                {/* Distance */}
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <Navigation className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                                    <div className="text-xl font-bold text-blue-800">
                                        {notif.distance.text}
                                    </div>
                                    <div className="text-xs text-gray-600">Road Distance</div>
                                </div>

                                {/* Travel Time */}
                                <div className="text-center p-3 bg-purple-50 rounded-lg">
                                    <Clock className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                                    <div className="text-xl font-bold text-purple-800">
                                        {notif.duration.text}
                                    </div>
                                    <div className="text-xs text-gray-600">Est. Time</div>
                                </div>

                                {/* Stops Away */}
                                <div className="text-center p-3 bg-orange-50 rounded-lg">
                                    <MapPin className="w-5 h-5 mx-auto mb-1 text-orange-600" />
                                    <div className="text-xl font-bold text-orange-800">
                                        {notif.stopsAway}
                                    </div>
                                    <div className="text-xs text-gray-600">Stops Away</div>
                                </div>
                            </div>

                            {/* Expandable GPS Coordinates */}
                            <button
                                onClick={() => toggleExpand(notif.id)}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                {expandedId === notif.id ? '▼ Hide' : '▶ Show'} GPS Coordinates
                            </button>

                            {expandedId === notif.id && (
                                <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono space-y-1">
                                    <div>
                                        <span className="font-semibold">Passenger:</span>{' '}
                                        {notif.passenger.lat.toFixed(6)}, {notif.passenger.lng.toFixed(6)}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Your Bus:</span>{' '}
                                        {notif.bus.lat.toFixed(6)}, {notif.bus.lng.toFixed(6)}
                                    </div>
                                </div>
                            )}

                            {/* Timestamp */}
                            <div className="mt-2 text-xs text-gray-500">
                                {new Date(notif.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Audio Test Button (Development Only - Remove in Production) */}
            {process.env.NODE_ENV === 'development' && (
                <button
                    onClick={() => driverAlertSound.test()}
                    className="mt-4 w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                >
                    🔊 Test Alert Sound
                </button>
            )}
        </div>
    );
}
