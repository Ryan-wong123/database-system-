// src/components/Navbar.js
import { NavLink, Link } from 'react-router-dom';

export default function Navbar() {
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
          {/* Main nav links */}
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <NavLink className="nav-link" to="/donate">Donate Food</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/booking">Booking</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/inventory">Inventory</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/history">Donation History</NavLink>
            </li>
          </ul>

          <div className="d-flex">
            <NavLink className="btn btn-outline-primary me-2" to="/login">
              Login
            </NavLink>
            <NavLink className="btn btn-primary" to="/register">
              Sign Up
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}
