import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * Check authentication status
   * Called on app mount and after login/register
   */
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/me');
      
      if (response.data?.data?.user) {
        setUser(response.data.data.user);
        setIsAuthenticated(true);
        // Store user in localStorage for persistence
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      } else {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user');
      }
    } catch (error) {
      // Silent fail - user is not authenticated
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load user from localStorage on initial mount
   * Provides faster initial load
   */
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
    // Verify with server
    checkAuth();
  }, [checkAuth]);

  /**
   * Register new user
   */
  const register = async (username, email, password) => {
    try {
      const response = await api.post('/auth/register', {
        username,
        email,
        password,
      });

      if (response.data?.data?.user) {
        setUser(response.data.data.user);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        if (response.data.data.accessToken) {
          localStorage.setItem('accessToken', response.data.data.accessToken);
        }
        toast.success('Registration successful! Welcome!');
        return { success: true, user: response.data.data.user };
      }
      
      return { success: false, error: 'Registration failed' };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  /**
   * Login user
   */
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      if (response.data?.data?.user) {
        setUser(response.data.data.user);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        if (response.data.data.accessToken) {
          localStorage.setItem('accessToken', response.data.data.accessToken);
        }
        toast.success('Welcome back!');
        return { success: true, user: response.data.data.user };
      }
      
      return { success: false, error: 'Login failed' };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Silent fail - clear local state anyway
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      toast.success('Logged out successfully');
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (data) => {
    try {
      const response = await api.patch('/auth/update-profile', data);
      
      if (response.data?.data?.user) {
        setUser(response.data.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        toast.success('Profile updated successfully');
        return { success: true, user: response.data.data.user };
      }
      
      return { success: false, error: 'Failed to update profile' };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  /**
   * Change password
   */
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.patch('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      
      toast.success('Password changed successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to change password';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};