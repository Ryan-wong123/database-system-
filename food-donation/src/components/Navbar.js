import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light border-bottom">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">Food Donation</Link>
        <div className="collapse navbar-collapse">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <NavLink className="nav-link" to="/donate">Donate</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/inventory">Inventory</NavLink>
            </li>
            {user?.role === 'household' && (
              <li className="nav-item">
                <NavLink className="nav-link" to="/booking">Booking</NavLink>
              </li>
            )}
            {user?.role === 'admin' && (
              <li className="nav-item">
                <NavLink className="nav-link" to="/admin">Admin</NavLink>
              </li>
            )}
          </ul>
          <div className="d-flex">
            {user ? (
              <>
                <NavLink className="btn btn-outline-secondary me-2" to="/profile">Profile</NavLink>
                <button
                  className="btn btn-danger"
                  onClick={() => { logout(); navigate('/'); }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink className="btn btn-outline-primary me-2" to="/login">Login</NavLink>
                <NavLink className="btn btn-primary" to="/register">Sign Up</NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
