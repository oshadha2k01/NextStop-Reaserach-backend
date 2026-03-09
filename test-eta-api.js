/**
 * ETA API Test Script
 * Tests the ETA endpoint with your specified parameters
 */

const axios = require('axios');

// Configuration
const BASE_URLS = {
  localhost: 'http://localhost:3000',
  production: 'https://smartbusstop.me/backend'
};

const TEST_PARAMS = {
  busId: 'ESP32_WROOM_DA_01',
  userLat: 6.9124,
  userLng: 79.8516
};

/**
 * Test ETA endpoint
 */
async function testETAEndpoint(baseUrl, testType) {
  const endpoint = `${baseUrl}/api/eta`;
  const queryParams = new URLSearchParams({
    busId: TEST_PARAMS.busId,
    userLat: TEST_PARAMS.userLat,
    userLng: TEST_PARAMS.userLng
  });

  const fullUrl = `${endpoint}?${queryParams.toString()}`;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${testType}`);
  console.log(`URL: ${fullUrl}`);
  console.log(`${'='.repeat(60)}`);

  try {
    const response = await axios.get(fullUrl, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ SUCCESS - Status:', response.status);
    console.log('\nResponse Data:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    if (error.response) {
      console.log('\n❌ ERROR - Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n❌ ERROR: Connection refused');
      console.log('Make sure the server is running on', baseUrl);
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n❌ ERROR: Host not found');
      console.log('Check your URL:', baseUrl);
    } else {
      console.log('\n❌ ERROR:', error.message);
    }
  }
}

/**
 * Health check endpoint
 */
async function testHealthCheck(baseUrl, testType) {
  const endpoint = `${baseUrl}/api/eta/health`;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing Health Check: ${testType}`);
  console.log(`URL: ${endpoint}`);
  console.log(`${'='.repeat(60)}`);

  try {
    const response = await axios.get(endpoint, {
      timeout: 5000
    });

    console.log('\n✅ SUCCESS - Status:', response.status);
    console.log('\nResponse Data:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    if (error.response) {
      console.log('\n❌ ERROR - Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('\n❌ ERROR:', error.message);
    }
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           ETA API Test Suite                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Test parameters
  console.log('\nTest Parameters:');
  console.log(`  busId: ${TEST_PARAMS.busId}`);
  console.log(`  userLat: ${TEST_PARAMS.userLat}`);
  console.log(`  userLng: ${TEST_PARAMS.userLng}`);

  // Test localhost first
  console.log('\n\n📜 LOCALHOST TESTS');
  await testHealthCheck(BASE_URLS.localhost, 'Localhost');
  await testETAEndpoint(BASE_URLS.localhost, 'Localhost');

  // Test production
  console.log('\n\n📜 PRODUCTION TESTS');
  await testHealthCheck(BASE_URLS.production, 'Production');
  await testETAEndpoint(BASE_URLS.production, 'Production');

  console.log('\n\n✨ Test Suite Complete!\n');
}

// Run tests
main().catch(console.error);
