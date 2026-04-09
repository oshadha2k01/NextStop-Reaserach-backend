# Mobile App Integration Guide

## Overview
This document provides complete API integration specifications for mobile applications connecting to the NextStop backend system. All endpoints support both web and mobile clients with consistent JSON request/response formats.

---

## 1. Authentication

### SuperAdmin Login
**Endpoint:** `POST /api/superadmin/login`
```json
Request:
{
  "email": "superadmin@nextstop.com",
  "password": "securePassword123"
}

Response (200):
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "superadmin@nextstop.com",
    "role": "superadmin"
  }
}
```

### Admin Login
**Endpoint:** `POST /api/admin/login`
```json
Request:
{
  "email": "admin@nextstop.com",
  "password": "securePassword123"
}

Response (200):
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "admin@nextstop.com",
    "role": "admin"
  }
}
```

### Token Usage
Add the token to all subsequent requests as a Bearer token:
```
Authorization: Bearer <token>
```

---

## 2. Bus Management APIs

### Get All Buses
**Endpoint:** `GET /api/buses`
**Auth:** Required (Bearer token)

```json
Response (200):
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "regNo": "DL-01-AB-1234",
    "route": "Route 5 (Central)",
    "seats": 45,
    "approvalStatus": "approved",
    "driverName": "Anita Rao",
    "device_id": "ESP32_WROOM_DA_01",
    "createdAt": "2026-01-01T10:00:00Z",
    "updatedAt": "2026-01-05T14:30:00Z"
  }
]
```

### Get Bus by ID
**Endpoint:** `GET /api/buses/:id`
**Auth:** Required

```json
Response (200):
{
  "_id": "507f1f77bcf86cd799439012",
  "regNo": "DL-01-AB-1234",
  "route": "Route 5 (Central)",
  "seats": 45,
  "approvalStatus": "approved",
  "driverName": "Anita Rao",
  "device_id": "ESP32_WROOM_DA_01"
}
```

### Get Bus Image
**Endpoint:** `GET /api/buses/:id/image`
**Response:** Image file (PNG/JPG)
**Fallback:** Returns 404 if no image; mobile apps should handle gracefully with placeholder image

### Bus Stats
**Endpoint:** `GET /api/buses/stats`
**Auth:** Required

```json
Response (200):
{
  "totalBuses": 25,
  "approvedBuses": 22,
  "activeToday": 18,
  "inMaintenance": 3
}
```

---

## 3. Driver Management APIs

### Get All Drivers
**Endpoint:** `GET /api/drivers`
**Auth:** Required

```json
Response (200):
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Anita Rao",
    "email": "anita.rao@nextstop.com",
    "phone": "+91-9876543210",
    "licenseNumber": "DL1020230000123",
    "shift": "Morning",
    "status": "active",
    "rating": 4.5,
    "busId": "507f1f77bcf86cd799439012",
    "createdAt": "2026-01-01T10:00:00Z"
  }
]
```

### Create Driver
**Endpoint:** `POST /api/drivers`
**Auth:** Required (Admin role)

```json
Request:
{
  "name": "Anita Rao",
  "email": "anita.rao@nextstop.com",
  "phone": "+91-9876543210",
  "licenseNumber": "DL1020230000123",
  "shift": "Morning",
  "status": "active",
  "busId": "507f1f77bcf86cd799439012"
}

Response (201):
{
  "_id": "507f1f77bcf86cd799439013",
  "name": "Anita Rao",
  "email": "anita.rao@nextstop.com",
  "phone": "+91-9876543210",
  "licenseNumber": "DL1020230000123",
  "shift": "Morning",
  "status": "active",
  "rating": 0,
  "busId": "507f1f77bcf86cd799439012"
}
```

### Update Driver
**Endpoint:** `PUT /api/drivers/:id`
**Auth:** Required

```json
Request:
{
  "shift": "Evening",
  "status": "on-leave"
}

Response (200):
{
  "_id": "507f1f77bcf86cd799439013",
  "name": "Anita Rao",
  "shift": "Evening",
  "status": "on-leave"
}
```

### Delete Driver
**Endpoint:** `DELETE /api/drivers/:id`
**Auth:** Required

```json
Response (200):
{
  "message": "Driver deleted successfully"
}
```

### Driver Stats
**Endpoint:** `GET /api/drivers/stats`
**Auth:** Required

```json
Response (200):
{
  "totalDrivers": 15,
  "activeDrivers": 12,
  "inactiveDrivers": 2,
  "onLeaveDrivers": 1
}
```

---

## 4. Complaint Management APIs

### Get All Complaints
**Endpoint:** `GET /api/complaints`
**Auth:** Required

```json
Response (200):
[
  {
    "_id": "507f1f77bcf86cd799439014",
    "ticketId": "#C-1001",
    "passengerName": "John Doe",
    "category": "Bus Cleanliness",
    "priority": "High",
    "description": "Bus was dirty with trash on seats",
    "status": "Open",
    "createdAt": "2026-01-05T08:00:00Z",
    "updatedAt": "2026-01-05T14:30:00Z"
  }
]
```

### Create Complaint
**Endpoint:** `POST /api/complaints`
**Auth:** Required

```json
Request:
{
  "passengerName": "John Doe",
  "category": "Bus Cleanliness",
  "priority": "High",
  "description": "Bus was dirty with trash on seats"
}

Response (201):
{
  "_id": "507f1f77bcf86cd799439014",
  "ticketId": "#C-1001",
  "passengerName": "John Doe",
  "category": "Bus Cleanliness",
  "priority": "High",
  "description": "Bus was dirty with trash on seats",
  "status": "Open",
  "createdAt": "2026-01-05T08:00:00Z"
}
```

### Update Complaint
**Endpoint:** `PUT /api/complaints/:id`
**Auth:** Required

```json
Request:
{
  "status": "In Review",
  "priority": "Medium"
}

Response (200):
{
  "_id": "507f1f77bcf86cd799439014",
  "ticketId": "#C-1001",
  "status": "In Review",
  "priority": "Medium"
}
```

### Delete Complaint
**Endpoint:** `DELETE /api/complaints/:id`
**Auth:** Required

```json
Response (200):
{
  "message": "Complaint deleted successfully"
}
```

### Complaint Stats
**Endpoint:** `GET /api/complaints/stats`
**Auth:** Required

```json
Response (200):
{
  "total": 42,
  "open": 18,
  "inReview": 12,
  "resolved": 8,
  "closed": 4
}
```

---

## 5. Feedback APIs

### Get All Feedbacks
**Endpoint:** `GET /api/feedback`
**Auth:** Required

```json
Response (200):
[
  {
    "_id": "507f1f77bcf86cd799439015",
    "busRegNo": "DL-01-AB-1234",
    "driverName": "Anita Rao",
    "route": "Route 5 (Central)",
    "passengerName": "Priya Singh",
    "rating": 5,
    "feedback": "Great bus service, comfortable seats and punctual arrivals",
    "createdAt": "2026-01-02T16:00:00Z"
  }
]
```

### Alias Endpoint
**Endpoint:** `GET /api/feedbacks` (backward compatibility)
Same response as `/api/feedback`

### Create Feedback
**Endpoint:** `POST /api/feedback`
**Auth:** Optional (can be submitted anonymously)

```json
Request:
{
  "busRegNo": "DL-01-AB-1234",
  "driverName": "Anita Rao",
  "passengerName": "Priya Singh",
  "rating": 5,
  "feedback": "Great service!"
}

Response (201):
{
  "_id": "507f1f77bcf86cd799439015",
  "busRegNo": "DL-01-AB-1234",
  "driverName": "Anita Rao",
  "passengerName": "Priya Singh",
  "rating": 5,
  "feedback": "Great service!",
  "createdAt": "2026-01-05T16:00:00Z"
}
```

### Update Feedback
**Endpoint:** `PUT /api/feedback/:id`
**Auth:** Required

```json
Request:
{
  "rating": 4,
  "feedback": "Good service overall"
}

Response (200):
{
  "_id": "507f1f77bcf86cd799439015",
  "rating": 4,
  "feedback": "Good service overall"
}
```

### Delete Feedback
**Endpoint:** `DELETE /api/feedback/:id`
**Auth:** Required

```json
Response (200):
{
  "message": "Feedback deleted successfully"
}
```

### Feedback Stats
**Endpoint:** `GET /api/feedback/stats`
**Auth:** Required

```json
Response (200):
{
  "total": 156,
  "positive": 89,
  "neutral": 42,
  "negative": 25,
  "fiveStar": 65,
  "fourStar": 24,
  "threeStarOrLess": 67
}
```

---

## 6. Bus Device Registration APIs

### Register Device
**Endpoint:** `POST /api/bus-device/register`
**Auth:** Required

```json
Request:
{
  "busId": "507f1f77bcf86cd799439012",
  "deviceId": "ESP32_WROOM_DA_01"
}

Response (201):
{
  "_id": "507f1f77bcf86cd799439016",
  "busId": "507f1f77bcf86cd799439012",
  "deviceId": "ESP32_WROOM_DA_01",
  "is_active": true,
  "registeredAt": "2026-01-05T10:00:00Z"
}
```

### Get All Bus-Device Mappings
**Endpoint:** `GET /api/bus-device`
**Auth:** Required

```json
Response (200):
{
  "registrations": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "busId": "507f1f77bcf86cd799439012",
      "deviceId": "ESP32_WROOM_DA_01",
      "is_active": true,
      "registeredAt": "2026-01-05T10:00:00Z"
    }
  ]
}
```

### Get Bus Stats
**Endpoint:** `GET /api/bus-device/stats`
**Auth:** Required

```json
Response (200):
{
  "total": 20,
  "active": 18,
  "inactive": 2,
  "busesWithDevice": 18,
  "busesWithoutDevice": 7
}
```

### Get Unassigned Buses
**Endpoint:** `GET /api/bus-device/unassigned-buses`
**Auth:** Required

```json
Response (200):
[
  {
    "_id": "507f1f77bcf86cd799439017",
    "regNo": "DL-02-CD-5678",
    "route": "Route 12 (North)",
    "seats": 45,
    "approvalStatus": "approved"
  }
]
```

### Update Bus-Device Mapping
**Endpoint:** `PUT /api/bus-device/:busId`
**Auth:** Required

```json
Request:
{
  "is_active": false
}

Response (200):
{
  "_id": "507f1f77bcf86cd799439016",
  "is_active": false
}
```

### Delete Bus-Device Mapping
**Endpoint:** `DELETE /api/bus-device/:busId`
**Auth:** Required

```json
Response (200):
{
  "message": "Bus-device mapping deleted successfully"
}
```

---

## 7. Error Handling

All endpoints return consistent error responses:

```json
Error Response (4xx/5xx):
{
  "success": false,
  "message": "Descriptive error message",
  "error": "specific_error_code",
  "statusCode": 400
}
```

### Common Error Codes
- `AUTH_REQUIRED`: Missing or invalid authentication token
- `INVALID_ID`: Invalid MongoDB ObjectId format
- `DUPLICATE_LICENSE`: Driver license number already exists
- `BUS_NOT_FOUND`: Bus with given ID doesn't exist
- `NOT_AUTHORIZED`: User lacks permission for this action
- `VALIDATION_ERROR`: Request data validation failed

---

## 8. Mobile App Best Practices

### 1. Token Management
```
- Store token in secure storage (Keychain/Keystore)
- Implement token refresh mechanism
- Clear token on logout
- Use Bearer token in all authenticated requests
```

### 2. Image Handling
```
- Cache bus images locally
- Show placeholder while loading
- Fallback to default image if 404 returned
- URL: {API_BASE_URL}/buses/{busId}/image
```

### 3. Data Caching
```
- Cache stats endpoints (update every 5-10 minutes)
- Cache bus list (update on pull-to-refresh)
- Cache driver data (update on demand)
- Implement offline mode fallback
```

### 4. Error Handling
```
- Validate token before making requests
- Implement retry logic for network failures
- Show user-friendly error messages
- Log errors for debugging
```

### 5. Request Headers
```
Content-Type: application/json
Authorization: Bearer <token>
User-Agent: NextStopMobileApp/1.0 (Platform)
```

### 6. Data Validation
```
- Validate all required fields before submission
- Ensure phone numbers are in valid format (+91-xxxx-xxxxxx)
- Validate email format
- Check license number format (state-issuing-sequence format)
- Validate rating is between 1-5
```

---

## 9. Integration Checklist

- [ ] Implement authentication flow (login, token storage, refresh)
- [ ] Integrate bus list with driver names
- [ ] Integrate driver management CRUD
- [ ] Implement complaint creation and tracking
- [ ] Implement feedback submission (with anonymous option)
- [ ] Add bus device registration UI
- [ ] Cache implementation for offline support
- [ ] Image loading with placeholders
- [ ] Error handling and retry logic
- [ ] TokenRefresh mechanism
- [ ] Rate limiting handling (429 responses)

---

## 10. Testing Endpoints

### Test User Credentials
```
SuperAdmin:
  Email: demo.superadmin@nextstop.com
  Password: DemoPassword@2026

Admin:
  Email: demo.admin@nextstop.com
  Password: DemoPassword@2026
```

### Test Data
- Test Bus: DL-01-AB-1234 (Route 5, 45 seats)
- Test Driver: Anita Rao (Morning shift)
- Test Device: ESP32_WROOM_DA_01

---

## 11. Rate Limiting

All endpoints are subject to rate limiting:
- **Limit:** 1000 requests per hour per IP
- **Headers:** X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- **Status Code:** 429 (Too Many Requests)

---

## 12. Versioning

Current API Version: **1.0**
- Backward compatible with previous versions
- Breaking changes will be announced 2 weeks in advance
- Version specified in request header: `X-API-Version: 1.0`

---

## 13. Support & Debugging

For debugging:
1. Check network tab for request/response
2. Verify token validity (decode JWT if needed)
3. Check error message and error code
4. Review server logs at: `/backend/logs/`
5. Contact support: support@nextstop.com

---

**Last Updated:** January 2026
**API Base URL:** `http://localhost:3000/api` (Development) or `https://api.nextstop.com/api` (Production)
