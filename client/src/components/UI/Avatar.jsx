import React from 'react';
import { getFileUrl } from '../../utils/fileUrl';

const Avatar = ({ user, size = 'md', showStatus = false, className = '' }) => {
  if (!user) return null;

  const username = user.username || 'U';
  const isOnline = user.isOnline;
  const avatarColor = user.avatarColor || '#3B82F6';
  const avatarUrl = user.avatar ? getFileUrl(user.avatar) : null;

  // Get initials
  const initials = username.substring(0, 2).toUpperCase();

  // Size mapping
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-semibold',
    lg: 'w-12 h-12 text-base font-semibold',
    xl: 'w-16 h-16 text-xl font-bold',
    '2xl': 'w-24 h-24 text-3xl font-bold',
  };

  const statusDotSizes = {
    xs: 'w-1.5 h-1.5 border-[1px]',
    sm: 'w-2 h-2 border-[1.5px]',
    md: 'w-2.5 h-2.5 border-2',
    lg: 'w-3 h-3 border-2',
    xl: 'w-4 h-4 border-2',
    '2xl': 'w-5 h-5 border-[3px]',
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;
  const selectedStatusDotSize = statusDotSizes[size] || statusDotSizes.md;

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full select-none shrink-0 ${selectedSize} ${className}`}>
      {/* Circle Content */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username}
          className="w-full h-full rounded-full object-cover shadow-inner border border-slate-700/10"
          onError={(e) => {
            console.error('Avatar image failed to load:', avatarUrl);
            // Fallback: hide the image and display the initials div
            e.target.style.display = 'none';
            const initialsElement = e.target.nextSibling;
            if (initialsElement) {
              initialsElement.style.display = 'flex';
            }
          }}
        />
      ) : null}


      <div
        className="w-full h-full flex items-center justify-center rounded-full text-white tracking-wide shadow-inner border border-slate-700/10"
        style={{
          backgroundColor: avatarColor,
          display: avatarUrl ? 'none' : 'flex'
        }}
      >
        {initials}
      </div>

      {/* Online/Offline Status Indicator */}
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-slate-900 ${selectedStatusDotSize} ${
            isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};

export default Avatar;
