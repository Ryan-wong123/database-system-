import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Donate from './pages/Donate';
import Inventory from './pages/Inventory';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import DonationHistory from './pages/DonationHistory';
import Booking from './pages/Booking';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  const { user } = useAuth();

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <main className="container my-4 flex-grow-1">
        {user ? (
          <Routes>
            <Route path="/" element={<Home />} />

            {/* Donor/Admin only */}
            <Route
              path="/donate"
              element={
                <ProtectedRoute roles={['donor', 'admin']}>
                  <Donate />
                </ProtectedRoute>
              }
            />

            {/* Admin only */}
            <Route
              path="/inventory"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Inventory />
                </ProtectedRoute>
              }
            />

            {/* Donee (household) only */}
            <Route
              path="/booking"
              element={
                <ProtectedRoute roles={['donee']}>
                  <Booking />
                </ProtectedRoute>
              }
            />

            {/* Any authenticated user */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute roles={['admin', 'donee', 'donor']}>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Admin dashboard */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Public to logged-in users */}
            <Route path="/history" element={<DonationHistory />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<ContactUs />} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      <Footer />
    </div>
  );
}
