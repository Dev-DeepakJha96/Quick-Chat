import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff, FiMessageSquare } from 'react-icons/fi';
import { toast } from 'react-toastify';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else {
      if (password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      if (!/[a-z]/.test(password)) {
        newErrors.password = 'Password must contain at least one lowercase letter';
      }
      if (!/[A-Z]/.test(password)) {
        newErrors.password = 'Password must contain at least one uppercase letter';
      }
      if (!/[0-9]/.test(password)) {
        newErrors.password = 'Password must contain at least one number';
      }
      if (!/[!@#$%^&*]/.test(password)) {
        newErrors.password = 'Password must contain at least one special character (!@#$%^&*)';
      }
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const result = await register({
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password,
    });
    setLoading(false);

    if (result.success) {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-dvh w-full overflow-y-auto flex items-center justify-center bg-[#0F172A] py-12 px-4">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3">
            <FiMessageSquare className="text-white text-2xl" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create Account</h2>
          <p className="text-slate-400 text-sm mt-1">Join QuickChat today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div className="space-y-1">
            <label htmlFor="username" className="text-slate-300 text-sm font-medium">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <span className="text-slate-500 text-sm font-medium">@</span>
              </div>
              <input
                id="username"
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full pl-8 pr-4 py-2 bg-slate-900/50 border ${
                  errors.username ? 'border-red-500 focus:ring-red-500 font-medium' : 'border-slate-700 focus:ring-blue-500 font-medium'
                } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
              />
            </div>
            {errors.username && <p className="text-red-500 text-xs">{errors.username}</p>}
          </div>

          {/* Email Input */}
          <div className="space-y-1">
            <label htmlFor="email" className="text-slate-300 text-sm font-medium">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <FiMail />
              </div>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 bg-slate-900/50 border ${
                  errors.email ? 'border-red-500 focus:ring-red-500 font-medium' : 'border-slate-700 focus:ring-blue-500 font-medium'
                } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label htmlFor="password" className="text-slate-300 text-sm font-medium">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <FiLock />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 bg-slate-900/50 border ${
                  errors.password ? 'border-red-500 focus:ring-red-500 font-medium' : 'border-slate-700 focus:ring-blue-500 font-medium'
                } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs leading-tight">{errors.password}</p>}
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-slate-300 text-sm font-medium">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <FiLock />
              </div>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 bg-slate-900/50 border ${
                  errors.confirmPassword ? 'border-red-500 focus:ring-red-500 font-medium' : 'border-slate-700 focus:ring-blue-500 font-medium'
                } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
              />
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword}</p>}
          </div>

          <div className="text-slate-400 text-xs space-y-1 bg-slate-900/30 p-3 rounded-lg border border-slate-700/30">
            <p className="font-semibold text-slate-300">Password Requirements:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>At least 8 characters long</li>
              <li>At least one uppercase and one lowercase letter</li>
              <li>At least one number (0-9)</li>
              <li>At least one special character (!@#$%^&*)</li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer Link */}
        <p className="text-slate-400 text-sm text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-500 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
