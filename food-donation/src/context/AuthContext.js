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

  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
