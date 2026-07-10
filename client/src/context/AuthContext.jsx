import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await authService.getMe();
        if (response.success && response.data?.user) {
          setUser(response.data.user);
        }
      } catch (error) {
        // Ignored, user is not logged in yet
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login({ email, password });
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        toast.success('Logged in successfully!');
        return { success: true };
      }
      return { success: false, error: response.message };
    } catch (error) {
      const errorMsg = error.message || 'Login failed. Please check your credentials.';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      if (response.success) {
        toast.success(response.message || 'Registration successful! Check your email to verify your account.');
        return { success: true };
      }
      return { success: false, error: response.message };
    } catch (error) {
      const errorMsg = error.message || 'Registration failed. Please try again.';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      toast.success('Logged out successfully.');
    } catch (error) {
      setUser(null);
      toast.error(error.message || 'Logged out with error.');
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authService.updateMe(profileData);
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        toast.success('Profile updated successfully!');
        return { success: true };
      }
      return { success: false, error: response.message };
    } catch (error) {
      const errorMsg = error.message || 'Failed to update profile.';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const changePassword = async (passwordData) => {
    try {
      const response = await authService.changePassword(passwordData);
      if (response.success) {
        toast.success('Password changed successfully!');
        return { success: true };
      }
      return { success: false, error: response.message };
    } catch (error) {
      const errorMsg = error.message || 'Failed to change password.';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const verifyEmail = async (token) => {
    try {
      const response = await authService.verifyEmail(token);
      if (response.success) {
        toast.success('Email verified successfully! You can now log in.');
        return { success: true };
      }
      return { success: false, error: response.message };
    } catch (error) {
      const errorMsg = error.message || 'Failed to verify email.';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        verifyEmail,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
