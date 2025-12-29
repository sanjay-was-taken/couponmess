import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Container, Card, Form, Button, Alert, InputGroup } from "react-bootstrap";
import { ShieldLock, Eye, EyeSlash } from "react-bootstrap-icons";
import { authApi } from '../services/api';

const StaffLoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // New state to handle password visibility
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Please enter username and password");
      return;
    }

    try {
      setLoading(true);

      // Try volunteer login first
      try {
        const data = await authApi.volunteerLogin({ 
          username: username.trim(), 
          password 
        });

        // Login Context (saves token to localStorage & state)
        login(data.token, data.user);

        // Redirect to staff page for volunteers
        navigate('/staff');
        return;
      } catch (volunteerError) {
        // If volunteer login fails, try regular admin login
        const data = await authApi.login({ 
          username: username.trim(), 
          password 
        });

        // Login Context (saves token to localStorage & state)
        login(data.token, data.user);

        // Redirect based on Role
        if (data.user.role === 'admin') navigate('/admin');
        else navigate('/staff');
      }

    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>
      <Card style={{ maxWidth: 480, width: "100%", padding: 32, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
        
        {/* Header */}
        <div className="text-center mb-4">
          <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 60, height: 60 }}>
            <ShieldLock size={30} />
          </div>
          <h4 className="fw-bold">Klee Staff Access</h4>
          <p className="text-muted">Authorized personnel only</p>
        </div>

          {error && <Alert variant="danger" className="py-2 text-center small">{error}</Alert>}

          <Form onSubmit={handleStaffSubmit}>
            <Form.Group className="mb-3">
              <Form.Control 
                type="text" 
                placeholder="Username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                style={{ padding: "12px" }}
              />
            </Form.Group>
            
            {/* Password Field with Eye Icon */}
            <Form.Group className="mb-4">
              <InputGroup>
                <Form.Control 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  style={{ padding: "12px", borderRight: "none" }} 
                />
                <InputGroup.Text 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    cursor: "pointer", 
                    backgroundColor: "white", 
                    borderLeft: "none" 
                  }}
                >
                  {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>

            <Button variant="success" type="submit" className="w-100 py-2 fw-bold" disabled={loading}>
              {loading ? "Verifying..." : "Login"}
            </Button>
          </Form>
          
          <div className="text-center mt-4">
            <a href="/" className="text-decoration-none small text-muted">← Back to Student Login</a>
          </div>
        
      </Card>
    </Container>
  );
};

export default StaffLoginPage;
