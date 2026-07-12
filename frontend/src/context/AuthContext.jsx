import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('transitops_token'));
  const [loading, setLoading] = useState(true);

  // Restore session on mount if a token exists
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    axiosClient
      .get('/auth/me')
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        // Token invalid/expired — clear it
        localStorage.removeItem('transitops_token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (email, password) => {
    const res = await axiosClient.post('/auth/login', { email, password });
    const { token: jwt, user: userData } = res.data;
    localStorage.setItem('transitops_token', jwt);
    setToken(jwt);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('transitops_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
