# Login & Register Implementation Guide

## Overview
Complete login and register functionality has been implemented for both frontend and backend.

## Backend Setup

### 1. Environment Variables
The `.env` file has been configured with:
- `PORT=3000`
- `MONGO_URI=<your-mongodb-uri>`
- `JWT_SECRET=your_jwt_secret_key_change_this_in_production`

### 2. API Endpoints

#### Admin Authentication Routes
- **Register**: `POST /api/admin/register`
  - Body: `{ firstName, lastName, username, email, phoneNo, password }`
  - Response: `{ token, username }`

- **Login**: `POST /api/admin/login`
  - Body: `{ username, password }`
  - Response: `{ token, username }`

- **Get Profile**: `GET /api/admin/profile`
  - Headers: `Authorization: Bearer <token>`
  - Response: Admin object (without password)

- **Update Profile**: `PUT /api/admin/profile`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ firstName, lastName, username, email, phoneNo, currentPassword, newPassword }`

- **Delete Profile**: `DELETE /api/admin/profile`
  - Headers: `Authorization: Bearer <token>`

### 3. Backend Features
- Password hashing with bcrypt
- JWT token generation and verification
- Validation for duplicate username, email, and phone number
- Protected routes with middleware
- Profile management (read, update, delete)

## Frontend Setup

### 1. Environment Variables
The `.env` file includes:
- `VITE_API_BASE_URL=http://localhost:3000/api`
- Google Maps API key

### 2. Utility Files

#### API Utility (`src/utils/api.js`)
Provides API functions for:
- Admin registration and login
- Profile management
- Bus operations
- Prediction API calls

```javascript
import { authAPI } from '../utils/api';

// Usage examples:
await authAPI.adminRegister(data);
await authAPI.adminLogin(data);
await authAPI.adminGetProfile();
```

### 3. Authentication Context (`src/context/AuthContext.jsx`)
Manages global authentication state:
- User information
- Authentication token
- Loading state
- Methods: `login()`, `register()`, `logout()`

```javascript
import { useAuth } from '../context/AuthContext';

const { user, token, isAuthenticated, login, register, logout } = useAuth();
```

### 4. Protected Routes
Routes are protected using `ProtectedRoute` component:
- `/admindashbord` - Requires authentication
- `/add-bus` - Requires authentication

Unauthenticated users are redirected to `/login`

## Frontend Pages

### Login Page (`src/pages/Login.jsx`)
- Username and password input fields
- Form validation
- API integration with error handling
- Redirects to dashboard on successful login
- Link to register page

### Register Page (`src/pages/Register.jsx`)
- Multi-field form (firstName, lastName, username, email, phoneNo, password)
- Form validation
- API integration
- Error handling for duplicate fields
- Redirects to dashboard on successful registration
- Link to login page

## Running the Application

### Backend
```bash
cd backend
npm install
npm run dev  # or npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Testing the Authentication Flow

### 1. Register a New User
1. Navigate to `http://localhost:5173/register`
2. Fill in all required fields:
   - First Name
   - Last Name
   - Username (minimum 3 characters)
   - Email (valid email format)
   - Phone Number (10 digits)
   - Password (minimum 6 characters)
   - Confirm Password (must match)
3. Click "Create Account"
4. On success, you'll be redirected to the admin dashboard

### 2. Login
1. Navigate to `http://localhost:5173/login`
2. Enter username and password
3. Click "Sign In"
4. On success, you'll be redirected to the admin dashboard

### 3. Test Protected Routes
1. Try accessing `/admindashbord` without logging in
2. You should be redirected to the login page
3. After logging in, you should have access

## Data Storage
- **Token**: Stored in `localStorage` as `token`
- **Username**: Stored in `localStorage` as `username`
- **Clear storage**: Call `logout()` from useAuth hook

## Security Considerations
- Passwords are hashed with bcrypt (10 rounds)
- JWT tokens expire in 1 day
- Protected routes require valid JWT tokens
- Environment variables store sensitive data

## Future Enhancements
- Add refresh token mechanism
- Implement role-based access control (RBAC)
- Add email verification
- Add password reset functionality
- Implement rate limiting on auth endpoints
- Add CSRF protection
- Add OAuth integration (Google, GitHub)
