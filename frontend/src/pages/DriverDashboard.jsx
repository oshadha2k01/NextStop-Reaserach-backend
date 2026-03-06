import React, { useState } from 'react';
import { BusFront, Bell, Route, User, LogOut } from 'lucide-react';
import DriverBoardingAlerts from '../components/DriverBoardingAlerts';

/**
 * DriverDashboard Component
 * 
 * Main dashboard for bus drivers showing:
 * - Real-time passenger boarding notifications
 * - Current bus status and route information
 * - Driver profile
 * 
 * The driver logs in with their credentials and the system associates them
 * with a specific busId (MongoDB ObjectId). This busId is used to join the
 * Socket.IO room for receiving passenger notifications.
 * 
 * In production, busId should come from authentication context/state.
 * For this example, we'll use a prop or state.
 */

export default function DriverDashboard() {
    // In production, get this from AuthContext or login response
    // For now, using example busId (replace with actual MongoDB ObjectId)
    const [busId] = useState('65a1b2c3d4e5f6g7h8i9j0k1'); // Example MongoDB ObjectId
    const [driverInfo] = useState({
        name: 'Rohan Perera',
        busNumber: 'WP-AB-1234',
        route: 'Route 177: Kaduwela - Kollupitiya',
        shift: 'Morning Shift (6:00 AM - 2:00 PM)'
    });

    const handleLogout = () => {
        // Implement logout logic
        console.log('Driver logged out');
        // In production: clear auth tokens, redirect to login
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <header className="bg-white shadow-md border-b-4 border-blue-600">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <BusFront className="w-10 h-10 text-blue-600" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">Driver Dashboard</h1>
                                <p className="text-sm text-gray-600">{driverInfo.name}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Driver Info */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Bus Information Card */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-600">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <BusFront className="w-5 h-5 text-blue-600" />
                                Bus Information
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm text-gray-600">Bus Number</p>
                                    <p className="text-xl font-bold text-blue-800">{driverInfo.busNumber}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Route</p>
                                    <p className="font-semibold text-gray-800">{driverInfo.route}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Shift</p>
                                    <p className="font-medium text-gray-700">{driverInfo.shift}</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats Card */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-lg font-bold text-gray-800 mb-4">Today's Stats</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                    <span className="text-sm font-medium text-gray-700">Trips Completed</span>
                                    <span className="text-2xl font-bold text-green-700">3</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                    <span className="text-sm font-medium text-gray-700">Total Passengers</span>
                                    <span className="text-2xl font-bold text-blue-700">142</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                                    <span className="text-sm font-medium text-gray-700">Hours Driven</span>
                                    <span className="text-2xl font-bold text-purple-700">5.5</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Passenger Boarding Alerts */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-yellow-500">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Bell className="w-6 h-6 text-yellow-600" />
                                Passenger Boarding Alerts
                            </h2>
                            <p className="text-sm text-gray-600 mb-6">
                                You will receive real-time notifications when passengers indicate they're boarding your bus.
                                Each alert includes road distance, estimated travel time, and stops away.
                            </p>

                            {/* Main Alert Component */}
                            <DriverBoardingAlerts busId={busId} />
                        </div>
                    </div>
                </div>

                {/* Instructions Card (For Development/Testing) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                        <h3 className="font-bold text-yellow-800 mb-2">🧪 Testing Instructions</h3>
                        <p className="text-sm text-yellow-700 mb-2">
                            To test passenger boarding notifications, you need to:
                        </p>
                        <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1 ml-2">
                            <li>Ensure the backend server is running (npm start in backend/)</li>
                            <li>Open the test HTML file (passenger-test.html) in another browser tab</li>
                            <li>Enter your bus ID: <code className="bg-yellow-200 px-1 rounded">{busId}</code></li>
                            <li>Click "Send Boarding Notification" to trigger an alert here</li>
                            <li>The multi-layered sound will play and a card will appear above</li>
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
}
