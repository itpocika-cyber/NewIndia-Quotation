import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AUTH_TOKEN_KEY = 'pocika_auth_token';
export const AUTH_USER_KEY = 'pocika_auth_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY) || '');
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Validate session on mount if token exists
  useEffect(() => {
    async function verifySession() {
      if (!token) {
        api.auth.wakeUp();
        setIsLoading(false);
        return;
      }
      try {
        const response = await api.auth.getMe();
        if (response?.user) {
          setUser(response.user);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
        }
      } catch (err) {
        console.warn('Session verification failed, logging out:', err.message);
        logout();
      } finally {
        setIsLoading(false);
      }
    }

    verifySession();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.auth.login({ email, password });
    if (res?.token && res?.user) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem(AUTH_TOKEN_KEY, res.token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
      return res.user;
    }
    throw new Error(res?.error || 'Login failed.');
  };

  const logout = async () => {
    try {
      if (token) {
        await api.auth.logout();
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      setToken('');
      setUser(null);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token),
    isAdmin: user?.role === 'admin',
    isStaff: user?.role === 'staff',
    isLoading,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
