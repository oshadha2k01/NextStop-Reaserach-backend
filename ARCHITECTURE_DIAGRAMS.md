# Architecture & Data Flow Diagrams

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      NextStop Application                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐              ┌──────────────────┐     │
│  │   Frontend      │              │   Backend        │     │
│  │  (React/Vite)   │              │  (Node/Express)  │     │
│  │                  │              │                  │     │
│  │ ┌──────────────┐ │              │ ┌──────────────┐ │     │
│  │ │ Pages        │ │              │ │ Routes       │ │     │
│  │ │ - Login      │ │              │ │ - Auth       │ │     │
│  │ │ - Register   │ │◄─────API────►│ │ - Admin      │ │     │
│  │ │ - Dashboard  │ │   (JSON)     │ │ - Bus        │ │     │
│  │ └──────────────┘ │              │ └──────────────┘ │     │
│  │                  │              │                  │     │
│  │ ┌──────────────┐ │              │ ┌──────────────┐ │     │
│  │ │ Context      │ │              │ │ Middleware   │ │     │
│  │ │ - AuthCtx    │ │              │ │ - JWT verify │ │     │
│  │ └──────────────┘ │              │ └──────────────┘ │     │
│  │                  │              │                  │     │
│  │ ┌──────────────┐ │              │ ┌──────────────┐ │     │
│  │ │ Utils        │ │              │ │ Controllers  │ │     │
│  │ │ - api.js     │ │              │ │ - Auth       │ │     │
│  │ │ - alerts.js  │ │              │ │ - Admin      │ │     │
│  │ └──────────────┘ │              │ └──────────────┘ │     │
│  └──────────────────┘              │                  │     │
│                                     │ ┌──────────────┐ │     │
│                                     │ │ Models       │ │     │
│                                     │ │ - Admin      │ │     │
│                                     │ │ - Bus        │ │     │
│                                     │ └──────────────┘ │     │
│                                     └──────────────────┘     │
│                                             │                │
│                                             │ Mongoose       │
│                                             ▼                │
│                                     ┌──────────────────┐     │
│                                     │    MongoDB       │     │
│                                     │  (Atlas/Local)   │     │
│                                     └──────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    User Registration                          │
└──────────────────────────────────────────────────────────────┘

User fills form
    │
    ▼
[Frontend] Validate Input
    │
    ├─ Required fields?
    ├─ Email format?
    ├─ Phone 10 digits?
    ├─ Password min 6?
    │
    ▼
[Frontend] POST /api/admin/register
    │
    ▼
[Backend] adminAuthController.register()
    │
    ├─ Validate input again
    │
    ├─ Check duplicate username
    │
    ├─ Check duplicate email
    │
    ├─ Check duplicate phone
    │
    ▼
[Backend] Admin.create()
    │
    ├─ Hash password with bcrypt
    │
    ▼
[Database] Save to MongoDB
    │
    ▼
[Backend] Generate JWT Token
    │
    ├─ Token payload: { id: admin._id }
    ├─ Secret: process.env.JWT_SECRET
    ├─ Expiration: 1 day
    │
    ▼
[Backend] Return { token, username }
    │
    ▼
[Frontend] Store in localStorage
    │
    ├─ localStorage.setItem('token', token)
    ├─ localStorage.setItem('username', username)
    │
    ▼
[Frontend] Update AuthContext
    │
    ├─ setToken(token)
    ├─ setUser({ username })
    ├─ setIsAuthenticated(true)
    │
    ▼
[Frontend] Navigate to /admindashbord
    │
    ▼
✅ User Registered & Logged In


┌──────────────────────────────────────────────────────────────┐
│                    User Login                                 │
└──────────────────────────────────────────────────────────────┘

User enters credentials
    │
    ▼
[Frontend] Validate Input
    │
    ├─ Username required?
    ├─ Username min 3 chars?
    ├─ Password required?
    │
    ▼
[Frontend] POST /api/admin/login
    │ { username, password }
    │
    ▼
[Backend] adminAuthController.login()
    │
    ├─ Find user by username
    │
    ├─ User not found?
    │  └─ Return 401: "Invalid credentials"
    │
    ▼
[Backend] Compare passwords
    │
    ├─ bcrypt.compare(password, hashedPassword)
    │
    ├─ Password incorrect?
    │  └─ Return 401: "Invalid credentials"
    │
    ▼
[Backend] Generate JWT Token
    │
    ├─ Token payload: { id: admin._id }
    ├─ Secret: process.env.JWT_SECRET
    ├─ Expiration: 1 day
    │
    ▼
[Backend] Return { token, username }
    │
    ▼
[Frontend] Store in localStorage
    │
    ├─ localStorage.setItem('token', token)
    ├─ localStorage.setItem('username', username)
    │
    ▼
[Frontend] Update AuthContext
    │
    ├─ setToken(token)
    ├─ setUser({ username })
    ├─ setIsAuthenticated(true)
    │
    ▼
[Frontend] Navigate to /admindashbord
    │
    ▼
✅ User Logged In


┌──────────────────────────────────────────────────────────────┐
│                Protected Route Access                         │
└──────────────────────────────────────────────────────────────┘

User accesses /admindashbord
    │
    ▼
[Frontend] ProtectedRoute Component
    │
    ├─ Check AuthContext.isAuthenticated
    │
    ├─ Not authenticated?
    │  ├─ Show loading
    │  └─ Redirect to /login
    │
    ▼
[Frontend] Render Dashboard
    │
    ▼
User makes API request
    │
    ├─ GET /api/admin/profile
    │
    ▼
[Frontend] api.js - Attach Token
    │
    ├─ Get token from localStorage
    ├─ Add Authorization header
    │  └─ "Bearer eyJhbGciOiJIUzI1NiI..."
    │
    ▼
[Backend] JWT Middleware
    │
    ├─ Extract token from header
    │
    ├─ Verify token with secret
    │
    ├─ Invalid/expired token?
    │  └─ Return 401: "Invalid token"
    │
    ▼
[Backend] Get user from database
    │
    ├─ Find admin by token payload ID
    │
    ├─ User not found?
    │  └─ Return 401: "User not found"
    │
    ▼
[Backend] Attach user to request
    │
    ├─ req.user = admin object
    │
    ▼
[Backend] Route Handler
    │
    ├─ Access req.user
    ├─ Return user data
    │
    ▼
[Frontend] Receive Response
    │
    ▼
✅ Access Granted


┌──────────────────────────────────────────────────────────────┐
│                    Logout Flow                                │
└──────────────────────────────────────────────────────────────┘

User clicks logout
    │
    ▼
[Frontend] Call logout() from AuthContext
    │
    ├─ localStorage.removeItem('token')
    ├─ localStorage.removeItem('username')
    │
    ▼
[Frontend] Update AuthContext
    │
    ├─ setToken(null)
    ├─ setUser(null)
    ├─ setIsAuthenticated(false)
    │
    ▼
[Frontend] Navigate to /login
    │
    ▼
✅ User Logged Out
```

---

## 🔄 State Management Flow

```
┌─────────────────────────────────────────┐
│      React App                          │
└─────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│      AuthProvider                       │
│                                         │
│  State:                                 │
│  ├─ user: { username }                  │
│  ├─ token: string                       │
│  ├─ isLoading: boolean                  │
│  └─ isAuthenticated: boolean            │
│                                         │
│  Methods:                               │
│  ├─ login(token, username)              │
│  ├─ register(token, username)           │
│  └─ logout()                            │
└─────────────────────────────────────────┘
            │
    ┌───────┼───────┐
    │       │       │
    ▼       ▼       ▼
[Login] [Register] [Dashboard]
  Page    Page       Page
    │       │         │
    └───────┼────────┘
            │
            ▼
     useAuth Hook
     
   Returns:
   - user
   - token
   - isLoading
   - isAuthenticated
   - login()
   - register()
   - logout()
```

---

## 📊 API Call Flow

```
┌──────────────────────────────────────┐
│   Frontend Component                 │
│   (Login/Register/Dashboard)         │
└──────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│   authAPI function                   │
│   (api.js)                           │
│                                      │
│   - adminLogin()                     │
│   - adminRegister()                  │
│   - adminGetProfile()                │
│   - etc...                           │
└──────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│   apiCall() function                 │
│   (api.js)                           │
│                                      │
│   ├─ Get token from localStorage     │
│   ├─ Set up request config           │
│   ├─ Add Authorization header        │
│   ├─ Make fetch() call               │
│   └─ Parse response                  │
└──────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│   HTTP Request                       │
│   POST http://localhost:3000/api/... │
│   Headers:                           │
│   - Content-Type: application/json   │
│   - Authorization: Bearer <token>    │
│   Body: JSON data                    │
└──────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│   Backend Express Server             │
│   (server.js)                        │
│                                      │
│   Routes → Middleware → Controllers  │
└──────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│   JWT Middleware (if protected)      │
│   - Verify token                     │
│   - Extract user ID                  │
│   - Attach user to req               │
└──────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│   Controller Logic                   │
│   - Validate input                   │
│   - Process request                  │
│   - Interact with database           │
└──────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│   Database Query                     │
│   MongoDB                            │
│   - Find document                    │
│   - Insert document                  │
│   - Update document                  │
│   - Delete document                  │
└──────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│   HTTP Response                      │
│   Status: 200/201/400/401/500        │
│   Body: JSON response                │
└──────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│   Frontend Receives Response         │
│   - Parse JSON                       │
│   - Update state                     │
│   - Handle errors                    │
│   - Show alerts                      │
└──────────────────────────────────────┘
```

---

## 🔒 Security Layers

```
┌─────────────────────────────────────────┐
│         Security Layers                 │
├─────────────────────────────────────────┤
│                                         │
│  Layer 1: Client-side Validation        │
│  ├─ Required fields                     │
│  ├─ Format validation                   │
│  ├─ Length validation                   │
│  └─ User feedback                       │
│                                         │
│  Layer 2: HTTPS/TLS (Production)        │
│  ├─ Encrypted communication             │
│  ├─ Certificate validation              │
│  └─ Man-in-the-middle prevention        │
│                                         │
│  Layer 3: Server-side Validation        │
│  ├─ Input validation                    │
│  ├─ Type checking                       │
│  ├─ Business logic validation           │
│  └─ Error handling                      │
│                                         │
│  Layer 4: Authentication                │
│  ├─ Username/password verification      │
│  ├─ Credential comparison               │
│  ├─ JWT token generation                │
│  └─ Token expiration (1 day)            │
│                                         │
│  Layer 5: Password Security             │
│  ├─ Bcrypt hashing                      │
│  ├─ Salt (10 rounds)                    │
│  ├─ One-way encryption                  │
│  └─ Never stored in plain text          │
│                                         │
│  Layer 6: Authorization                 │
│  ├─ JWT middleware verification         │
│  ├─ Token validity check                │
│  ├─ User existence check                │
│  └─ Route protection                    │
│                                         │
│  Layer 7: Database Security             │
│  ├─ Unique constraints                  │
│  ├─ Data validation                     │
│  ├─ Access control                      │
│  └─ Audit logging (future)              │
│                                         │
│  Layer 8: Frontend Storage              │
│  ├─ localStorage with token             │
│  ├─ Automatic cleanup on logout         │
│  ├─ Protected route checking            │
│  └─ State management with context       │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📱 Component Hierarchy

```
App
├── Router
│   ├── Routes
│   │   ├── Route: /                    → Home
│   │   ├── Route: /login               → Login
│   │   ├── Route: /register            → Register
│   │   ├── ProtectedRoute: /admindashbord → AdminDashboard
│   │   └── ProtectedRoute: /add-bus    → AddBus
│   │
│   └── AuthProvider
│       ├── Context: AuthContext
│       └── useAuth Hook
│
├── Login Component
│   ├── Form Inputs
│   │   ├── Username input
│   │   └── Password input
│   ├── Validation Logic
│   ├── API Call
│   │   └── authAPI.adminLogin()
│   └── Error Handling
│
├── Register Component
│   ├── Form Inputs
│   │   ├── First Name
│   │   ├── Last Name
│   │   ├── Username
│   │   ├── Email
│   │   ├── Phone Number
│   │   ├── Password
│   │   └── Confirm Password
│   ├── Validation Logic
│   ├── API Call
│   │   └── authAPI.adminRegister()
│   └── Error Handling
│
└── Protected Components
    ├── Dashboard
    │   ├── User Info (from useAuth)
    │   ├── Logout Button
    │   └── Additional Features
    │
    └── AddBus
        ├── Form Inputs
        ├── API Calls (with token)
        └── Error Handling
```

---

## 📈 Data Flow Example: User Registration

```
User Input Form
↓
{
  firstName: "John",
  lastName: "Doe",
  username: "johndoe",
  email: "john@example.com",
  phoneNo: "1234567890",
  password: "password123"
}
↓
Frontend Validation ✓
↓
API Call: POST /api/admin/register
↓
Backend Validation ✓
↓
Check Uniqueness ✓
↓
Hash Password (bcrypt)
↓
{
  firstName: "John",
  lastName: "Doe",
  username: "johndoe",
  email: "john@example.com",
  phoneNo: "1234567890",
  password: "$2a$10$..." (hashed),
  createdAt: "2026-01-04...",
  updatedAt: "2026-01-04..."
}
↓
Save to MongoDB ✓
↓
Generate JWT Token
↓
{
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  username: "johndoe"
}
↓
Store in localStorage
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  username: "johndoe"
↓
Update AuthContext
  user: { username: "johndoe" }
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  isAuthenticated: true
↓
Show Success Alert ✓
↓
Redirect to /admindashbord ✓
```

---

**Architecture & Data Flow Documentation Complete ✅**
