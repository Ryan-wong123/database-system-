import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, email, role, token }

  useEffect(() => {
    const raw = localStorage.getItem('auth:user');
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const login = (payload) => {
    setUser(payload);
    localStorage.setItem('auth:user', JSON.stringify(payload));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth:user');
  };
  const loginDemo = () => {
    const demo = {
      id: 'demo-user',
      email: 'demo@example.org',
      role: 'household',   // or 'admin' / 'volunteer' if you want to test those routes
      token: 'demo-token'
    };
    setUser(demo);
    localStorage.setItem('auth:user', JSON.stringify(demo));
  };
  const value = useMemo(() => ({ user, login, logout, loginDemo }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
