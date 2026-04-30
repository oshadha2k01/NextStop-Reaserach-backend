const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const NationalRoute = require('../models/AllRoutes/NationalRoute');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const seedDatabase = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI not set in .env');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Read the JSON file
    const filePath = path.join(__dirname, '..', '..', 'data', 'sl_national_routes.json');
    if (!fs.existsSync(filePath)) {
      console.error('Data file not found:', filePath);
      process.exit(1);
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const routesData = JSON.parse(rawData);
    const routeList = Array.isArray(routesData) ? routesData : (routesData.routes || []);

    if (!Array.isArray(routeList) || routeList.length === 0) {
      console.error('No routes found in JSON file');
      process.exit(1);
    }

    const documents = routeList.map((route) => ({
      source: routesData.source || 'OpenStreetMap via Overpass API',
      country: routesData.country || 'Sri Lanka',
      province: route.province || 'Unknown',
      district: route.district || 'Unknown',
      route_number: String(route.route_number || 'UNKNOWN'),
      route_name: String(route.route_name || 'Unknown Route'),
      service_type: route.service_type || 'Normal',
      operator: route.operator || '',
      osm_id: route.osm_id,
      coordinate_count: route.coordinate_count,
      coordinates: Array.isArray(route.coordinates) ? route.coordinates : [],
      stages: []
    }));

    // Clear existing data to prevent duplicates during testing
    await NationalRoute.deleteMany();
    console.log('Cleared old routes');

    // Insert new data
    await NationalRoute.insertMany(documents);
    console.log(`Successfully seeded ${documents.length} routes!`);

    process.exit();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
