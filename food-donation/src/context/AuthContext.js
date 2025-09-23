import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);


const roleMap = {
  donee: 'donee',
  donor: 'donor',
  admin: 'admin',
};

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

  //used for demo login for different roles bypass
  const loginDemo = (kind = 'donee') => {
    const role = roleMap[kind];
    const demo = {
      id: `demo-${role}`,
      email: `${role}@demo.local`,
      role,              // 'donee' | 'donor' | 'admin'
      token: `demo-token-${role}`,
    };
    setUser(demo);
    localStorage.setItem('auth:user', JSON.stringify(demo));
  };

  const value = useMemo(() => ({ user, login, logout, loginDemo }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
