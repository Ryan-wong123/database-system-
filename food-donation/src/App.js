// src/App.js
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Donate from './pages/Donate';
import Inventory from './pages/Inventory';
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
          // Logged-in: full app
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
                <ProtectedRoute roles={['household']}>
                  <Booking />
                </ProtectedRoute>
              }
            />

            {/* Any authenticated role listed below */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute roles={['household', 'admin', 'volunteer', 'donor']}>
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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : (
          // Logged-out: Home only (plus optional login/register)
          <Routes>
            <Route path="/" element={<Home />} />
            {/* Keep these if you want public access to auth screens */}
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
