import React from 'react';
import { Navbar, Container, Dropdown } from 'react-bootstrap'; 
import { PersonCircle, BoxArrowRight, ShieldLock } from 'react-bootstrap-icons';
import { Link, useNavigate } from 'react-router-dom'; 
import { useAuth } from '../context/AuthContext';

const AppNavbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

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
    return "/dashboard"; 
  };

  return (
    <Navbar 
      bg="white" 
      className="shadow-sm border-bottom sticky-top"
      // 1. INCREASED HEIGHT: Changed minHeight to 90px and padding to py-3
      style={{ minHeight: '90px', padding: '12px 0' }} 
    >
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
            // 2. INCREASED LOGO SIZE
            style={{ height: '42px', width: 'auto' }} 
            className="me-3"
          />
          {/* 3. INCREASED TEXT SIZE */}
          <span style={{ letterSpacing: '-0.5px', fontSize: '1.4rem' }}>FeastOn</span>
        </Navbar.Brand>
        
        {/* RIGHT SIDE CONTENT */}
        <div className="d-flex align-items-center">
          
          {isAuthenticated && user && (
            <Dropdown align="end">
              <Dropdown.Toggle 
                variant="light" 
                id="dropdown-basic" 
                // Increased padding for a larger button look
                className="d-flex align-items-center border bg-white rounded-pill px-3 py-2 shadow-sm"
                style={{ transition: 'all 0.2s' }}
              >
                <div className="bg-light rounded-circle p-1 text-success d-flex align-items-center justify-content-center">
                  {/* 4. INCREASED ICON SIZE */}
                  <PersonCircle size={30}/>
                </div>
                
                {/* 5. INCREASED NAME SIZE (Removed 'small' class, added fontSize) */}
                <span className="fw-semibold text-dark ms-3 d-none d-sm-block" style={{ fontSize: '1rem' }}>
                  {getCleanName(user.name)}
                </span>
              </Dropdown.Toggle>

              <Dropdown.Menu className="shadow-lg border-0 mt-3 p-2 rounded-4" style={{ minWidth: '260px', position: 'absolute' }}>
                
                {/* Mobile Name */}
                <div className="px-3 py-2 border-bottom mb-2 d-block d-sm-none">
                  <p className="mb-0 fw-bold text-dark" style={{ fontSize: '1.1rem' }}>{getCleanName(user.name)}</p>
                </div>

                {/* Desktop Name */}
                <div className="px-3 py-2 border-bottom mb-2 d-none d-sm-block">
                  <p className="mb-0 fw-bold text-dark" style={{ fontSize: '1.1rem' }}>{getCleanName(user.name)}</p>
                  <small className="text-muted" style={{ fontSize: '0.85rem' }}>{user.email}</small>
                </div>

                <Dropdown.ItemText className="mb-2">
                  <span className={`badge bg-${user.role === 'admin' ? 'danger' : 'primary'}-subtle text-${user.role === 'admin' ? 'danger' : 'primary'} border border-${user.role === 'admin' ? 'danger' : 'primary'}-subtle rounded-pill px-3 py-2`} style={{ fontSize: '0.85rem' }}>
                    {user.role.toUpperCase()}
                  </span>
                </Dropdown.ItemText>

                {user.role === 'admin' && (
                  <Dropdown.Item as={Link} to="/admin" className="rounded-3 py-2" style={{ fontSize: '1rem' }}>
                    <ShieldLock className="me-2" /> Admin Panel
                  </Dropdown.Item>
                )}

                <Dropdown.Divider className="my-2" />

                <Dropdown.Item onClick={handleLogout} className="text-danger rounded-3 py-2 fw-semibold" style={{ fontSize: '1rem' }}>
                  <BoxArrowRight className="me-2" /> Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>

      </Container>
    </Navbar>
  );
};

export default AppNavbar;