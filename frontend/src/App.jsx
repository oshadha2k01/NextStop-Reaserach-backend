import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import AddBus from './pages/AddBus';
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
          
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admindashbord" element={<ProtectedRoute element={<AdminDashboard />} />} />
          <Route path="/add-bus" element={<ProtectedRoute element={<AddBus />} />} />
          <Route path="/superadmindashbord" element={<ProtectedRoute element={<SuperAdminDashboard />} />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}


