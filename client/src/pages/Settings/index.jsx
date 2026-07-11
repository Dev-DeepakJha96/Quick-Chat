import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiArrowLeft, FiLock, FiEye, FiEyeOff, FiSave } from 'react-icons/fi';

const Settings = () => {
  const { changePassword } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else {
      if (newPassword.length < 8) {
        newErrors.newPassword = 'Password must be at least 8 characters';
      }
      if (!/[a-z]/.test(newPassword)) {
        newErrors.newPassword = 'Password must contain at least one lowercase letter';
      }
      if (!/[A-Z]/.test(newPassword)) {
        newErrors.newPassword = 'Password must contain at least one uppercase letter';
      }
      if (!/[0-9]/.test(newPassword)) {
        newErrors.newPassword = 'Password must contain at least one number';
      }
      if (!/[!@#$%^&*]/.test(newPassword)) {
        newErrors.newPassword = 'Password must contain at least one special character (!@#$%^&*)';
      }
      if (currentPassword === newPassword) {
        newErrors.newPassword = 'New password must be different from current password';
      }
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const result = await changePassword({ currentPassword, newPassword });
    setLoading(false);

    if (result.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      navigate('/');
    }
  };

  return (
    <div className="min-h-dvh w-full overflow-y-auto bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 transition-colors duration-200">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-8 shadow-xl dark:shadow-2xl relative z-10">
        {/* Header Navigation */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
          >
            <FiArrowLeft className="text-lg" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">App Settings</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure theme options and password settings</p>
          </div>
        </div>

        {/* Settings options */}
        <div className="space-y-8">


          {/* Change Password Form */}
          <div className="bg-slate-50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/30 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Security & Password</h2>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password Field */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wider">CURRENT PASSWORD</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <FiLock />
                  </div>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900/50 border ${
                      errors.currentPassword ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                    } rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all font-medium text-sm`}
                  />
                </div>
                {errors.currentPassword && (
                  <p className="text-red-500 text-xs">{errors.currentPassword}</p>
                )}
              </div>

              {/* New Password Field */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wider">NEW PASSWORD</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <FiLock />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2 bg-white dark:bg-slate-900/50 border ${
                      errors.newPassword ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                    } rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all font-medium text-sm`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-red-500 text-xs leading-tight">{errors.newPassword}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wider">CONFIRM NEW PASSWORD</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <FiLock />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900/50 border ${
                      errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                    } rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all font-medium text-sm`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Requirements box */}
              <div className="text-slate-500 dark:text-slate-400 text-[11px] space-y-0.5 bg-slate-100 dark:bg-slate-950/30 p-3 rounded-lg border border-slate-200 dark:border-slate-700/20">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Password Policy Requirements:</p>
                <ul className="list-disc pl-4">
                  <li>At least 8 characters long</li>
                  <li>At least one uppercase and one lowercase letter</li>
                  <li>At least one number & one symbol (!@#$%^&*)</li>
                </ul>
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FiSave className="text-lg" />
                    <span>Change Password</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
