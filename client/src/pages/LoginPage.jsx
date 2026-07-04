import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat');
    }
  }, [isAuthenticated, navigate]);

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);
    
    if (result.success) {
      navigate('/chat');
    } else if (result.serverErrors) {
      const fieldErrors = {};
      result.serverErrors.forEach(({ field, message }) => {
        fieldErrors[field] = message;
      });
      setErrors(fieldErrors);
    }
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600">
            💬 Chat App
          </h1>
          <p className="text-gray-600 mt-2">Sign in to start chatting</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={errors.email ? 'input-error' : 'input'}
                placeholder="Enter your email"
                disabled={isSubmitting}
                autoComplete="email"
              />
              {errors.email && (
                <p className="error-text">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="label">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={errors.password ? 'input-error' : 'input'}
                placeholder="Enter your password"
                disabled={isSubmitting}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="error-text">{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-3 text-base"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="small" className="text-white" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Register Link */}
          <p className="text-center text-gray-600 mt-6">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default LoginPage;