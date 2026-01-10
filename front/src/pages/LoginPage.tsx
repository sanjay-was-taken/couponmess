import React, { useState } from "react";
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext'; 
import { useNavigate } from 'react-router-dom';
import { Container, Card } from 'react-bootstrap';
import { authApi } from '../services/api';
import { useTheme } from '../context/ThemeContext'; // 1. Import Theme Hook

const LoginPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const { colors } = useTheme(); // 2. Get dynamic colors
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
    <Container 
      className="d-flex align-items-center justify-content-center" 
      style={{ 
        minHeight: "100vh", 
        backgroundColor: colors.ui.background // 3. Dynamic Page Background
      }}
    >
      <Card 
        style={{ 
          maxWidth: 480, 
          width: "100%", 
          padding: 32, 
          border: `1px solid ${colors.ui.border}`, // 4. Dynamic Border
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          backgroundColor: colors.ui.card // 5. Dynamic Card Background
        }}
      >
        
        {/* Header Section with Logo and Name */}
        <div className="text-center mb-4">
           <img 
            src="/klee-logo.png" 
            alt="Klee Logo" 
            style={{ width: '80px', height: 'auto' }} 
            className="mb-3"
          />
          <h4 className="fw-bold" style={{ color: colors.text.primary }}>FeastOn</h4>
          <p style={{ color: colors.text.secondary }}>Sign in with your IIIT Kottayam account</p>
        </div>

        {/* Google Login Button */}
        <div className="d-flex justify-content-center mb-3">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google Login Failed")}
            useOneTap
            shape="rectangular"
            width="100%"
            // theme="filled_blue" // Optional: Google button has its own internal theme prop
          />
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="text-center small mb-3" style={{ color: colors.error.main }}>{error}</div>
        )}

        {/* Footer Info */}
        <div className="text-center" style={{ fontSize: 12, color: colors.text.disabled }}>
          Only <strong style={{ color: colors.text.secondary }}>@iiitkottayam.ac.in</strong> accounts are allowed
        </div>
        
        {/* Hidden Staff Link (Bottom Dot) */}
        <div className="mt-5 text-center">
            <a 
              href="/staff-access" 
              style={{ 
                fontSize: '10px', 
                color: colors.ui.border, // Barely visible in both modes
                textDecoration: 'none' 
              }}
            >
              .
            </a>
        </div>

      </Card>
    </Container>
  );
};

export default LoginPage;