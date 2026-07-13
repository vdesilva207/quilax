import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import secureStorage from '@/lib/secureStorage';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadAuth();
  }, []);

  const loadAuth = async () => {
    try {
      const storedToken = await secureStorage.getItem('authToken');
      const storedUser = await secureStorage.getItem('authUser');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        apiClient.setToken(storedToken);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
    } finally {
      setLoading(false);
    }
  };

  const persistSession = async (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setIsAuthenticated(true);
    apiClient.setToken(nextToken);
    await secureStorage.setItem('authToken', nextToken);
    await secureStorage.setItem('authUser', JSON.stringify(nextUser));
  };

  const login = async (email, password) => {
    try {
      const data = await apiClient.post('/auth/login', { email, password });
      await persistSession(data.token, data.user);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, fullName) => {
    try {
      const data = await apiClient.post('/auth/register', { email, password, fullName });
      await persistSession(data.token, data.user);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await apiClient.post('/auth/logout').catch(() => {});
      }
    } finally {
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      apiClient.clearToken();
      await secureStorage.removeItem('authToken');
      await secureStorage.removeItem('authUser');
    }
    return { success: true };
  };

  const updateUser = async (payload) => {
    try {
      const data = await apiClient.put('/auth/profile', payload);
      const nextUser = data.user || data.profile || data;
      setUser(nextUser);
      await secureStorage.setItem('authUser', JSON.stringify(nextUser));
      return { success: true, user: nextUser };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
