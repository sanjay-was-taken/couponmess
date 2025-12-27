import React from 'react';
import { Navbar, Container, Button, Dropdown } from 'react-bootstrap';
import { PersonCircle, BoxArrowRight, ShieldLock } from 'react-bootstrap-icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AppNavbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getCleanName = (fullName: string | undefined) => {
    if (!fullName) return "User";
    return fullName.split('-')[0].trim();
  };

  const getHomeRoute = () => {
    if (!isAuthenticated || !user) return "/login";
    if (user.role === 'admin') return "/admin";
    if (user.role === 'volunteer') return "/staff";
    return "/dashboard"; // Default for students
  };

  return (
    <Navbar bg="white" className="shadow-sm border-bottom sticky-top py-3">
      <Container className="d-flex justify-content-between align-items-center">
        
        {/* LOGO (Left Side) */}
        <Navbar.Brand 
            as={Link} 
            to={getHomeRoute()} 
            className="fw-bold d-flex align-items-center text-dark p-0"
        >
          <img 
            src="/klee-logo.png" 
            alt="Klee Logo" 
            style={{ height: '35px', width: 'auto' }} 
            className="me-2"
          />
          <span style={{ letterSpacing: '-0.5px', fontSize: '1.2rem' }}>Klee</span>
        </Navbar.Brand>
        
        {/* RIGHT SIDE CONTENT */}
        <div className="d-flex align-items-center">
          
          {isAuthenticated && user ? (
            // --- LOGGED IN STATE ---
            <Dropdown align="end">
              <Dropdown.Toggle 
                variant="light" 
                id="dropdown-basic" 
                className="d-flex align-items-center border bg-white rounded-pill px-2 px-md-3 py-1 py-md-2 shadow-sm"
                style={{ transition: 'all 0.2s' }}
              >
                {/* Avatar Circle */}
                <div className="bg-light rounded-circle p-1 text-success d-flex align-items-center justify-content-center">
                  <PersonCircle size={24}/>
                </div>
                
                {/* Name (Desktop only) */}
                <span className="fw-semibold small text-dark ms-2 d-none d-sm-block">
                  {getCleanName(user.name)}
                </span>
              </Dropdown.Toggle>

              <Dropdown.Menu className="shadow-lg border-0 mt-3 p-2 rounded-4" style={{ minWidth: '240px', position: 'absolute' }}>
                
                {/* Name Display (Mobile) */}
                <div className="px-3 py-2 border-bottom mb-2 d-block d-sm-none">
                  <p className="mb-0 fw-bold text-dark">{getCleanName(user.name)}</p>
                </div>

                {/* Name Display (Desktop) */}
                <div className="px-3 py-2 border-bottom mb-2 d-none d-sm-block">
                  <p className="mb-0 fw-bold text-dark">{getCleanName(user.name)}</p>
                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>{user.email}</small>
                </div>

                {/* Role Badge */}
                <Dropdown.ItemText className="mb-2">
                  <span className={`badge bg-${user.role === 'admin' ? 'danger' : 'primary'}-subtle text-${user.role === 'admin' ? 'danger' : 'primary'} border border-${user.role === 'admin' ? 'danger' : 'primary'}-subtle rounded-pill px-3`}>
                    {user.role.toUpperCase()}
                  </span>
                </Dropdown.ItemText>

                {/* Admin Link (Only if Admin) */}
                {user.role === 'admin' && (
                  <Dropdown.Item as={Link} to="/admin" className="rounded-3 py-2">
                    <ShieldLock className="me-2" /> Admin Panel
                  </Dropdown.Item>
                )}

                <Dropdown.Divider className="my-2" />

                {/* Logout */}
                <Dropdown.Item onClick={handleLogout} className="text-danger rounded-3 py-2 fw-semibold">
                  <BoxArrowRight className="me-2" /> Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            // --- LOGGED OUT STATE ---
            //    UPDATE: Hide button if on ANY login-related page
            !['/login', '/staff-access'].includes(location.pathname) && (
              <Link to="/login">
                <Button 
                  variant="dark" 
                  className="px-4 py-2 rounded-pill fw-semibold shadow-sm"
                  style={{ fontSize: '0.9rem' }}
                >
                  Login
                </Button>
              </Link>
            )
          )}
        </div>

      </Container>
    </Navbar>
  );
};

export default AppNavbar;