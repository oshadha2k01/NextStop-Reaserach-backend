# API Testing Guide - cURL & Postman Examples

## 🧪 Testing Authentication Endpoints

### Prerequisites
- Backend running on `http://localhost:3000`
- cURL or Postman installed
- MongoDB connection working

---

## 1️⃣ User Registration

### cURL Example
```bash
curl -X POST http://localhost:3000/api/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "phoneNo": "1234567890",
    "password": "password123"
  }'
```

### Expected Response (201 Created)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "johndoe"
}
```

### Postman Setup
1. Method: POST
2. URL: `http://localhost:3000/api/admin/register`
3. Headers: `Content-Type: application/json`
4. Body (raw):
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "phoneNo": "1234567890",
  "password": "password123"
}
```

### Validation Rules
- ✅ firstName: required, non-empty
- ✅ lastName: required, non-empty
- ✅ username: required, min 3 chars, unique
- ✅ email: required, valid format, unique
- ✅ phoneNo: required, exactly 10 digits, unique
- ✅ password: required, min 6 chars

---

## 2️⃣ User Login

### cURL Example
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "password123"
  }'
```

### Expected Response (200 OK)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "johndoe"
}
```

### Postman Setup
1. Method: POST
2. URL: `http://localhost:3000/api/admin/login`
3. Headers: `Content-Type: application/json`
4. Body (raw):
```json
{
  "username": "johndoe",
  "password": "password123"
}
```

### Error Cases
```json
{
  "message": "Invalid credentials"
}
```

---

## 3️⃣ Get User Profile (Protected)

### cURL Example
```bash
curl -X GET http://localhost:3000/api/admin/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Expected Response (200 OK)
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "phoneNo": "1234567890",
  "createdAt": "2026-01-04T10:30:00.000Z",
  "updatedAt": "2026-01-04T10:30:00.000Z"
}
```

### Postman Setup
1. Method: GET
2. URL: `http://localhost:3000/api/admin/profile`
3. Headers:
   - Key: `Authorization`
   - Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Error Cases
```json
{
  "message": "No token, authorization denied"
}
```

---

## 4️⃣ Update User Profile (Protected)

### cURL Example
```bash
curl -X PUT http://localhost:3000/api/admin/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phoneNo": "9876543210",
    "currentPassword": "password123",
    "newPassword": "newpassword123"
  }'
```

### Expected Response (200 OK)
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "firstName": "Jane",
  "lastName": "Smith",
  "username": "johndoe",
  "email": "jane@example.com",
  "phoneNo": "9876543210",
  "updatedAt": "2026-01-04T11:30:00.000Z"
}
```

### Postman Setup
1. Method: PUT
2. URL: `http://localhost:3000/api/admin/profile`
3. Headers:
   - Key: `Authorization`
   - Value: `Bearer YOUR_TOKEN_HERE`
   - Key: `Content-Type`
   - Value: `application/json`
4. Body (raw):
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phoneNo": "9876543210",
  "currentPassword": "password123",
  "newPassword": "newpassword123"
}
```

### Validation Rules
- currentPassword: required if changing password
- newPassword: must be different from current
- All other fields: optional

---

## 5️⃣ Delete User Profile (Protected)

### cURL Example
```bash
curl -X DELETE http://localhost:3000/api/admin/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Expected Response (200 OK)
```json
{
  "message": "Admin deleted successfully"
}
```

### Postman Setup
1. Method: DELETE
2. URL: `http://localhost:3000/api/admin/profile`
3. Headers:
   - Key: `Authorization`
   - Value: `Bearer YOUR_TOKEN_HERE`

---

## 🔄 Complete Test Workflow

### Step 1: Register
```bash
curl -X POST http://localhost:3000/api/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "username": "testuser",
    "email": "test@example.com",
    "phoneNo": "1111111111",
    "password": "test123"
  }'
```
**Save the token from response**

### Step 2: Login
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123"
  }'
```

### Step 3: Get Profile
```bash
curl -X GET http://localhost:3000/api/admin/profile \
  -H "Authorization: Bearer <SAVED_TOKEN>"
```

### Step 4: Update Profile
```bash
curl -X PUT http://localhost:3000/api/admin/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SAVED_TOKEN>" \
  -d '{
    "firstName": "Updated",
    "currentPassword": "test123"
  }'
```

### Step 5: Delete Profile
```bash
curl -X DELETE http://localhost:3000/api/admin/profile \
  -H "Authorization: Bearer <SAVED_TOKEN>"
```

---

## ❌ Error Handling

### 400 Bad Request - Missing Fields
```json
{
  "message": "Missing required fields"
}
```

### 400 Bad Request - Duplicate Username
```json
{
  "message": "Username already exists"
}
```

### 400 Bad Request - Duplicate Email
```json
{
  "message": "Email already exists"
}
```

### 400 Bad Request - Duplicate Phone
```json
{
  "message": "Phone number already exists"
}
```

### 400 Bad Request - Wrong Password
```json
{
  "message": "Current password is incorrect"
}
```

### 401 Unauthorized - Invalid Credentials
```json
{
  "message": "Invalid credentials"
}
```

### 401 Unauthorized - Invalid Token
```json
{
  "message": "Invalid token"
}
```

### 401 Unauthorized - No Token
```json
{
  "message": "No token, authorization denied"
}
```

### 404 Not Found
```json
{
  "message": "Admin not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "error message"
}
```

---

## 🛠️ Postman Collection Import

### Create Collection
1. Open Postman
2. Create new collection: "NextStop Auth"
3. Add requests:

#### Request 1: Register
- Name: Register User
- Method: POST
- URL: `{{baseUrl}}/admin/register`
- Body: (see above)

#### Request 2: Login
- Name: Login User
- Method: POST
- URL: `{{baseUrl}}/admin/login`
- Body: (see above)

#### Request 3: Get Profile
- Name: Get Profile
- Method: GET
- URL: `{{baseUrl}}/admin/profile`
- Headers: (see above)

#### Request 4: Update Profile
- Name: Update Profile
- Method: PUT
- URL: `{{baseUrl}}/admin/profile`
- Headers: (see above)
- Body: (see above)

#### Request 5: Delete Profile
- Name: Delete Profile
- Method: DELETE
- URL: `{{baseUrl}}/admin/profile`
- Headers: (see above)

### Set Environment Variable
1. Create new environment: "NextStop Dev"
2. Add variable:
   - Key: `baseUrl`
   - Value: `http://localhost:3000/api`
   - Key: `token`
   - Value: (paste token from register/login response)

3. Use `{{baseUrl}}` and `{{token}}` in requests

---

## 📝 Notes

- Tokens are valid for **1 day** (86400 seconds)
- Passwords are **hashed with bcrypt** - never store plain text
- All endpoints return **JSON** responses
- **CORS** is enabled for frontend requests
- Response times should be **< 200ms** for local testing

---

## 🔗 Quick Reference

| Endpoint | Method | Auth | Status |
|----------|--------|------|--------|
| /api/admin/register | POST | No | ✅ Working |
| /api/admin/login | POST | No | ✅ Working |
| /api/admin/profile | GET | Yes | ✅ Working |
| /api/admin/profile | PUT | Yes | ✅ Working |
| /api/admin/profile | DELETE | Yes | ✅ Working |

---

**Happy Testing! 🚀**
