// src/components/Navbar.js
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const renderRoleLinks = (role) => {
    switch (role) {
      case 'donee':
        return (
          <>
            <li className="nav-item">
              <NavLink className="nav-link" to="/booking">Booking</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/history">Donation History</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/inventory">Inventory</NavLink>
            </li>
          </>
        );
      case 'donor':
        return (
          <>
            <li className="nav-item">
              <NavLink className="nav-link" to="/donate">Donate Food</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/history">Donation History</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/inventory">Inventory</NavLink>
            </li>
          </>
        );
      case 'admin':
        return (
          <>
            <li className="nav-item">
              <NavLink className="nav-link" to="/inventory">Inventory</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/history">Donation History</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/admin">Admin</NavLink>
            </li>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light border-bottom">
      <div className="container">
        {/* Logo */}
        <Link className="navbar-brand fw-bold" to="/">Food Donation</Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {user && renderRoleLinks(user.role)}
          </ul>

          {/* Auth buttons */}
          <div className="d-flex">
            {user ? (
              <>
                <NavLink className="btn btn-outline-secondary me-2" to="/profile">
                  Profile
                </NavLink>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink className="btn btn-outline-primary me-2" to="/login">
                  Login
                </NavLink>
                <NavLink className="btn btn-primary" to="/register">
                  Sign Up
                </NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
