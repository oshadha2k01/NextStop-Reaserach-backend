/**
 * Socket.IO Test Client for Driver Boarding Notifications
 * 
 * This script simulates a driver's mobile app connecting to the backend
 * and listening for passenger boarding notifications.
 * 
 * Usage:
 * 1. Ensure backend server is running (npm start in backend/)
 * 2. Run this script: node test-socket-client.js
 * 3. Send boarding notification via Postman
 * 4. Watch this console receive the real-time event
 * 
 * Test Multiple Buses:
 * node test-socket-client.js 65a1b2c3d4e5f6g7h8i9j0k1
 * node test-socket-client.js another-bus-id-here
 */

const io = require('socket.io-client');

// Get busId from command line argument, or use default
const busId = process.argv[2] || '65a1b2c3d4e5f6g7h8i9j0k1';

// Backend URL (change if deployed)
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     NextStop Socket.IO Test Client - Driver Mode        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log(`🚌 Bus ID: ${busId}`);
console.log(`🔗 Backend URL: ${BACKEND_URL}`);
console.log(`🔌 Attempting to connect...\n`);

// Create Socket.IO client
const socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

// Track connection state
let isConnected = false;
let notificationCount = 0;

// Connection successful
socket.on('connect', () => {
    isConnected = true;
    console.log('✅ Socket.IO connected successfully!');
    console.log(`📡 Socket ID: ${socket.id}`);
    console.log(`⏰ Time: ${new Date().toLocaleTimeString()}\n`);
    
    // Join driver's private room
    console.log(`🚪 Joining driver room for bus: ${busId}...`);
    socket.emit('driver_join', { busId });
});

// Confirmation that driver joined room
socket.on('driver_joined', (data) => {
    console.log('✅ Successfully joined driver room!');
    console.log(`📦 Room: ${data.room}`);
    console.log(`💬 Message: ${data.message}\n`);
    console.log('─'.repeat(60));
    console.log('🎧 Now listening for passenger boarding notifications...');
    console.log('📱 Use Postman to send a boarding notification to see it here!');
    console.log('─'.repeat(60));
    console.log('\n');
});

// 🎯 Main Event: Passenger Boarding Notification
socket.on('passenger_boarding', (payload) => {
    notificationCount++;
    
    console.log('\n');
    console.log('═'.repeat(60));
    console.log('🚏 PASSENGER BOARDING NOTIFICATION RECEIVED!');
    console.log('═'.repeat(60));
    
    console.log(`\n📊 Notification #${notificationCount}`);
    console.log(`⏰ Time: ${new Date(payload.timestamp).toLocaleString()}\n`);
    
    // Display key information
    console.log('📍 LOCATION DETAILS:');
    console.log(`   Passenger: (${payload.passenger.lat}, ${payload.passenger.lng})`);
    console.log(`   Your Bus:  (${payload.bus.lat}, ${payload.bus.lng})\n`);
    
    console.log('📏 DISTANCE & TIME:');
    console.log(`   Road Distance: ${payload.distance.text} (${payload.distance.meters}m)`);
    console.log(`   Travel Time:   ${payload.duration.text} (${payload.duration.seconds}s)`);
    console.log(`   Stops Away:    ${payload.stopsAway} stops\n`);
    
    console.log('📦 FULL PAYLOAD:');
    console.log(JSON.stringify(payload, null, 2));
    
    console.log('\n' + '═'.repeat(60));
    console.log('🔔 In mobile app: This would trigger:');
    console.log('   1. Multi-layered audio alert (1200Hz + 880Hz + 220Hz)');
    console.log('   2. Visual notification card with yellow border');
    console.log('   3. Pulsing "NEW" badge');
    console.log('   4. Update unacknowledged counter');
    console.log('═'.repeat(60) + '\n');
});

// Disconnection
socket.on('disconnect', (reason) => {
    isConnected = false;
    console.log('\n❌ Socket.IO disconnected!');
    console.log(`📋 Reason: ${reason}`);
    console.log(`⏰ Time: ${new Date().toLocaleTimeString()}\n`);
    
    if (reason === 'io server disconnect') {
        console.log('🔄 Server disconnected the socket. Attempting to reconnect...');
        socket.connect();
    }
});

// Connection error
socket.on('connect_error', (error) => {
    console.error('\n❌ Connection error!');
    console.error(`📋 Error: ${error.message}`);
    console.error(`⏰ Time: ${new Date().toLocaleTimeString()}`);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Is backend server running? (npm start in backend/)');
    console.error('   2. Check BACKEND_URL is correct');
    console.error('   3. Verify MongoDB is connected\n');
});

// Reconnection attempt
socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 Reconnection attempt #${attemptNumber}...`);
});

// Reconnection successful
socket.on('reconnect', (attemptNumber) => {
    console.log(`✅ Reconnected after ${attemptNumber} attempts!`);
    console.log(`📡 Socket ID: ${socket.id}\n`);
    
    // Rejoin room after reconnection
    socket.emit('driver_join', { busId });
});

// Reconnection failed
socket.on('reconnect_failed', () => {
    console.error('\n❌ Reconnection failed after all attempts');
    console.error('💡 Please check the backend server and try again\n');
    process.exit(1);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down Socket.IO test client...');
    console.log(`📊 Total notifications received: ${notificationCount}`);
    socket.disconnect();
    process.exit(0);
});

// Keep script running
console.log('💡 Press Ctrl+C to stop the test client\n');

// Send heartbeat every 30 seconds to keep connection alive
setInterval(() => {
    if (isConnected) {
        const uptime = Math.floor(process.uptime());
        const minutes = Math.floor(uptime / 60);
        const seconds = uptime % 60;
        console.log(`💓 Heartbeat: Connected for ${minutes}m ${seconds}s | Notifications: ${notificationCount}`);
    }
}, 30000);
