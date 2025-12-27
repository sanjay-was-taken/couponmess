import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from 'react-bootstrap';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  // 1. Wait for Auth check to finish
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="success" />
      </div>
    );
  }

  // 2. Not Logged In? -> Go to Login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Wrong Role? -> Go to Home/Error
  if (!allowedRoles.includes(user.role)) {
    alert("Access Denied: You are not authorized to view this page.");
    return <Navigate to="/" replace />;
  }

  // 4. Success -> Render the page
  return <Outlet />;
};

export default ProtectedRoute;