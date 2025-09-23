// src/App.js
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
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

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  // Routes that require auth (and sometimes specific roles)
  const authedRoutes = [
    { path: '/', element: <Home /> },

    { path: '/donate',
      roles: ['donor', 'admin'],
      element: <Donate />
    },

    { path: '/inventory',
      roles: ['admin', 'donee', 'donor'],
      element: <Inventory />
    },

    { path: '/booking',
      roles: ['donee'],
      element: <Booking />
    },

    { path: '/profile',
      roles: ['admin', 'donee', 'donor'],
      element: <Profile />
    },

    { path: '/admin',
      roles: ['admin'],
      element: <Dashboard />
    },

    { path: '/history',
      roles: ['admin', 'donee', 'donor'],
      element: <DonationHistory />
    },

    { path: '/about', element: <AboutUs /> },
    { path: '/contact', element: <ContactUs /> },
  ];

  // Routes available when NOT logged in
  const publicRoutes = [
    { path: '/', element: <Home /> },
    { path: '/login', element: <Login /> },
    { path: '/register', element: <Register /> },
  ];

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <main className="container my-4 flex-grow-1">
        <Routes>
          {user
            ? authedRoutes.map(({ path, element, roles }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    roles ? (
                      <ProtectedRoute roles={roles}>{element}</ProtectedRoute>
                    ) : (
                      element
                    )
                  }
                />
              ))
            : publicRoutes.map(({ path, element }) => (
                <Route key={path} path={path} element={element} />
              ))}

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
