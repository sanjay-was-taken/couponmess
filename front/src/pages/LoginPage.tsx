import React, { useState } from "react";
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext'; 
import { useNavigate } from 'react-router-dom';
import { Container, Card } from 'react-bootstrap';
import { authApi } from '../services/api';

const LoginPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      const { credential } = credentialResponse;
      if (!credential) return;

      //    API CALL: Google Login
      const data = await authApi.googleLogin(credential);

      // Login Context (saves token to localStorage & state)
      login(data.token, data.user);
      
      // Redirect based on Role
      if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'volunteer') navigate('/staff');
      else navigate('/dashboard');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Login Failed");
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>
      <Card style={{ maxWidth: 480, width: "100%", padding: 32, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
        
        {/* Header Section with Logo and Name */}
        <div className="text-center mb-4">
           <img 
            src="/klee-logo.png" 
            alt="Klee Logo" 
            style={{ width: '80px', height: 'auto' }} 
            className="mb-3"
          />
          <h4 className="fw-bold">Klee</h4>
          <p className="text-muted">Sign in with your IIIT Kottayam account</p>
        </div>

        {/* Google Login Button */}
        <div className="d-flex justify-content-center mb-3">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google Login Failed")}
            useOneTap
            shape="rectangular"
            width="100%"
          />
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="text-danger text-center small mb-3">{error}</div>
        )}

        {/* Footer Info */}
        <div className="text-center" style={{ fontSize: 12, color: "#888" }}>
          Only <strong>@iiitkottayam.ac.in</strong> accounts are allowed
        </div>
        
        {/* Hidden Staff Link (Bottom Dot) */}
        <div className="mt-5 text-center">
            <a href="/staff-access" style={{ fontSize: '10px', color: '#eee', textDecoration: 'none' }}>.</a>
        </div>

      </Card>
    </Container>
  );
};

export default LoginPage;