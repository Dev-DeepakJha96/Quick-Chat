import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const VerifyEmailPage = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await api.post('/auth/verify-email', { token });
        if (response.data?.success) {
          setStatus('success');
          setMessage(response.data.message || 'Email verified successfully');
        } else {
          setStatus('error');
          setMessage('Verification failed');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The link may be invalid or expired.');
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600">
            💬 Chat App
          </h1>
          <p className="text-gray-600 mt-2">Email verification</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 text-center animate-fade-in">
          {status === 'loading' && (
            <div className="space-y-4">
              <LoadingSpinner size="large" />
              <p className="text-gray-600">Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="text-5xl">✅</div>
              <h2 className="text-xl font-semibold text-green-600">Email Verified</h2>
              <p className="text-gray-600">{message}</p>
              <Link
                to="/login"
                className="inline-block mt-4 text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                Sign in to continue
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="text-5xl">❌</div>
              <h2 className="text-xl font-semibold text-red-600">Verification Failed</h2>
              <p className="text-gray-600">{message}</p>
              <Link
                to="/login"
                className="inline-block mt-4 text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                Back to login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
