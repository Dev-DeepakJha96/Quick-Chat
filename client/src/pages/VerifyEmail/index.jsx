import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiCheckCircle, FiXCircle, FiLoader, FiMessageSquare } from 'react-icons/fi';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  
  const token = searchParams.get('token');

  useEffect(() => {
    const handleVerification = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing. Please check your link.');
        return;
      }

      try {
        const response = await verifyEmail(token);
        if (response.success) {
          setStatus('success');
          setMessage('Your email has been successfully verified! You can now log in.');
          // Redirect after 4 seconds
          setTimeout(() => {
            navigate('/login');
          }, 4000);
        } else {
          setStatus('error');
          setMessage(response.error || 'Failed to verify email. The link might be expired or invalid.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('An error occurred during verification. Please try again later.');
      }
    };

    handleVerification();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl relative z-10 text-center">
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3">
            <FiMessageSquare className="text-white text-2xl" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Email Verification</h2>
        </div>

        {status === 'verifying' && (
          <div className="flex flex-col items-center py-6 space-y-4">
            <FiLoader className="text-blue-500 text-5xl animate-spin" />
            <p className="text-slate-300">Verifying your email address, please wait...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center py-6 space-y-4">
            <FiCheckCircle className="text-emerald-500 text-5xl" />
            <p className="text-emerald-400 font-semibold text-lg">Verification Successful!</p>
            <p className="text-slate-300 text-sm">{message}</p>
            <p className="text-slate-400 text-xs mt-2">Redirecting you to login page shortly...</p>
            <Link
              to="/login"
              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all"
            >
              Go to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center py-6 space-y-4">
            <FiXCircle className="text-rose-500 text-5xl" />
            <p className="text-rose-400 font-semibold text-lg">Verification Failed</p>
            <p className="text-slate-300 text-sm">{message}</p>
            <div className="flex space-x-4 mt-4">
              <Link
                to="/register"
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all"
              >
                Sign Up Again
              </Link>
              <Link
                to="/login"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all"
              >
                Go to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
