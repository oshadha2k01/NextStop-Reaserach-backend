/**
 * BusDevice Bridge Setup Script
 * 
 * This script helps administrators register IoT devices with buses
 * by creating entries in the bus_devices collection.
 * 
 * Usage:
 * 1. Update MONGO_URI in this script or use environment variable
 * 2. Run: node scripts/registerBusDevice.js
 * 3. Follow the prompts to enter bus ID and device ID
 * 
 * Or run directly with parameters:
 * node scripts/registerBusDevice.js <busId> <deviceId>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const BusDevice = require('../models/Bus/BusDevice');
const readline = require('readline');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nextstop';

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Promisify readline question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * Validate MongoDB ObjectId format
 */
function isValidObjectId(id) {
    return /^[a-f\d]{24}$/i.test(id);
}

/**
 * Register a new BusDevice mapping
 */
async function registerBusDevice(busId, deviceId) {
    try {
        // Validate bus_id format
        if (!isValidObjectId(busId)) {
            console.error('❌ Invalid bus_id format. Must be a 24-character hex string (MongoDB ObjectId)');
            console.log('   Example: 65a1b2c3d4e5f6g7h8i9j0k1');
            return false;
        }

        // Check if bus_id already registered
        const existingByBusId = await BusDevice.findOne({ bus_id: busId });
        if (existingByBusId) {
            console.log('⚠️  This bus already has a registered device:');
            console.log(`   Bus ID: ${existingByBusId.bus_id}`);
            console.log(`   Device ID: ${existingByBusId.device_id}`);
            console.log(`   Registered: ${existingByBusId.registered_at}`);
            
            const overwrite = await question('   Do you want to update it? (y/n): ');
            if (overwrite.toLowerCase() !== 'y') {
                console.log('❌ Registration cancelled');
                return false;
            }

            // Update existing
            existingByBusId.device_id = deviceId;
            existingByBusId.is_active = true;
            await existingByBusId.save();
            
            console.log('✅ BusDevice updated successfully!');
            console.log(`   Bus ID: ${busId}`);
            console.log(`   Device ID: ${deviceId}`);
            return true;
        }

        // Check if device_id already registered
        const existingByDeviceId = await BusDevice.findOne({ device_id: deviceId });
        if (existingByDeviceId) {
            console.error('❌ This device_id is already registered to another bus:');
            console.log(`   Bus ID: ${existingByDeviceId.bus_id}`);
            console.log(`   Device ID: ${existingByDeviceId.device_id}`);
            return false;
        }

        // Create new registration
        const newBusDevice = new BusDevice({
            bus_id: busId,
            device_id: deviceId,
            is_active: true
        });

        await newBusDevice.save();

        console.log('✅ BusDevice registered successfully!');
        console.log(`   Bus ID: ${busId}`);
        console.log(`   Device ID: ${deviceId}`);
        console.log(`   Registered At: ${newBusDevice.registered_at}`);
        
        return true;

    } catch (error) {
        console.error('❌ Error registering BusDevice:', error.message);
        return false;
    }
}

/**
 * List all registered BusDevices
 */
async function listBusDevices() {
    try {
        const devices = await BusDevice.find().sort({ registered_at: -1 });
        
        if (devices.length === 0) {
            console.log('📋 No BusDevices registered yet');
            return;
        }

        console.log(`\n📋 Registered BusDevices (${devices.length} total):\n`);
        console.log('─'.repeat(80));
        
        devices.forEach((device, index) => {
            console.log(`${index + 1}. Bus ID: ${device.bus_id}`);
            console.log(`   Device ID: ${device.device_id}`);
            console.log(`   Active: ${device.is_active ? '✅' : '❌'}`);
            console.log(`   Registered: ${device.registered_at.toLocaleString()}`);
            console.log('─'.repeat(80));
        });

    } catch (error) {
        console.error('❌ Error listing BusDevices:', error.message);
    }
}

/**
 * Deactivate a BusDevice
 */
async function deactivateBusDevice(busId) {
    try {
        const device = await BusDevice.findOne({ bus_id: busId });
        
        if (!device) {
            console.error('❌ No BusDevice found with that bus_id');
            return false;
        }

        device.is_active = false;
        await device.save();

        console.log('✅ BusDevice deactivated');
        console.log(`   Bus ID: ${device.bus_id}`);
        console.log(`   Device ID: ${device.device_id}`);
        
        return true;

    } catch (error) {
        console.error('❌ Error deactivating BusDevice:', error.message);
        return false;
    }
}

/**
 * Main interactive menu
 */
async function main() {
    try {
        // Connect to MongoDB
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Check for command-line arguments
        const args = process.argv.slice(2);
        
        if (args.length === 2) {
            // Direct registration mode
            const [busId, deviceId] = args;
            await registerBusDevice(busId, deviceId);
            process.exit(0);
        }

        // Interactive mode
        while (true) {
            console.log('\n╔════════════════════════════════════════╗');
            console.log('║   BusDevice Registration Tool         ║');
            console.log('╚════════════════════════════════════════╝\n');
            console.log('1. Register new BusDevice');
            console.log('2. List all BusDevices');
            console.log('3. Deactivate BusDevice');
            console.log('4. Exit\n');

            const choice = await question('Select option (1-4): ');

            switch (choice.trim()) {
                case '1': {
                    console.log('\n--- Register New BusDevice ---\n');
                    const busId = await question('Enter Bus MongoDB ObjectId (24 hex characters): ');
                    const deviceId = await question('Enter IoT Device ID (e.g., ESP32-Route177-Bus01): ');
                    await registerBusDevice(busId.trim(), deviceId.trim());
                    break;
                }

                case '2': {
                    await listBusDevices();
                    break;
                }

                case '3': {
                    console.log('\n--- Deactivate BusDevice ---\n');
                    const busId = await question('Enter Bus MongoDB ObjectId to deactivate: ');
                    await deactivateBusDevice(busId.trim());
                    break;
                }

                case '4': {
                    console.log('\n👋 Goodbye!');
                    process.exit(0);
                }

                default: {
                    console.log('❌ Invalid option. Please select 1-4.');
                }
            }
        }

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    } finally {
        rl.close();
        await mongoose.connection.close();
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
    console.log('\n\n👋 Interrupted. Closing...');
    rl.close();
    await mongoose.connection.close();
    process.exit(0);
});

// Run main function
if (require.main === module) {
    main();
}

module.exports = { registerBusDevice, listBusDevices, deactivateBusDevice };
