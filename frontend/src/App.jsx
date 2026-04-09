import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import SuperAdminLogin from './pages/SuperAdminLogin';
import LoginChooser from './pages/LoginChooser';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import AddBus from './pages/AddBus';
import AddDriver from './pages/AddDriver';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

// Protected Route Component
const ProtectedRoute = ({ element }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return isAuthenticated ? element : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          
          <Route path="/" element={<Home />} />
          <Route path="/access" element={<LoginChooser />} />
          <Route path="/login" element={<Login />} />
          <Route path="/superadminlogin" element={<SuperAdminLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admindashbord" element={<ProtectedRoute element={<AdminDashboard />} />} />
          <Route path="/admin-dashboard" element={<ProtectedRoute element={<AdminDashboard />} />} />
          <Route path="/add-bus" element={<ProtectedRoute element={<AddBus />} />} />
          <Route path="/add-driver" element={<ProtectedRoute element={<AddDriver />} />} />
          <Route path="/superadmindashboard" element={<SuperAdminDashboard />} />
          <Route path="/superadmindashbord" element={<Navigate to="/superadmindashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}


