import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/UI/Avatar';
import { chatService } from '../../services/chat';
import { toast } from 'react-toastify';
import { 
  FiArrowLeft, 
  FiUser, 
  FiMail, 
  FiCheck, 
  FiSave, 
  FiCamera, 
  FiUpload, 
  FiTrash2 
} from 'react-icons/fi';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || '#3B82F6');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  const fileInputRef = useRef(null);

  // Palette of beautiful, curated avatar colors
  const colorPalette = [
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#f43f5e', // Rose
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#06b6d4', // Cyan
  ];

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

    if (!/^#[0-9a-fA-F]{6}$/.test(avatarColor)) {
      newErrors.avatarColor = 'Must be a valid hex color code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }

    // Validate size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size cannot exceed 5MB');
      return;
    }

    setUploading(true);
    const loadingToast = toast.loading('Uploading profile picture...');
    try {
      const response = await chatService.uploadFile(file);
      if (response.success && response.data?.file) {
        setAvatar(response.data.file.url);
        toast.update(loadingToast, {
          render: 'Profile picture uploaded!',
          type: 'success',
          isLoading: false,
          autoClose: 2000,
        });
      }
    } catch (err) {
      toast.update(loadingToast, {
        render: err.message || 'Failed to upload profile picture.',
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.info('Profile picture cleared. Don\'t forget to save changes!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const result = await updateProfile({
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      avatarColor,
      avatar,
    });
    setLoading(false);

    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 transition-colors duration-200">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-8 shadow-xl dark:shadow-2xl relative z-10">
        {/* Header Navigation */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-505 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
          >
            <FiArrowLeft className="text-lg" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Edit Profile</h1>
            <p className="text-xs text-slate-505 dark:text-slate-400">Update your account information</p>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Picture & Color Section */}
          <div className="flex flex-col items-center gap-5 bg-slate-50 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/30">
            {/* Interactive Avatar Container */}
            <div className="relative group cursor-pointer select-none" onClick={handleAvatarClick}>
              <Avatar 
                user={{ username, avatarColor, avatar }} 
                size="2xl" 
                className="group-hover:opacity-85 transition-opacity duration-200 border-2 border-slate-200 dark:border-slate-700/30" 
              />
              
              {/* Camera Icon Overlay on Hover */}
              <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <FiCamera className="text-white text-xl" />
                <span className="text-[10px] text-white font-semibold">Change</span>
              </div>

              {/* Uploading Spinner */}
              {uploading && (
                <div className="absolute inset-0 bg-slate-950/70 rounded-full flex items-center justify-center z-10">
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                </div>
              )}
            </div>

            {/* Upload Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAvatarClick}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700/50 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <FiUpload size={13} />
                Upload Photo
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 rounded-lg text-xs font-semibold border border-rose-500/20 transition-colors flex items-center gap-1.5"
                >
                  <FiTrash2 size={13} />
                  Remove
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            
            {/* Color Palette Picker */}
            <div className="text-center w-full border-t border-slate-200 dark:border-slate-700/40 pt-4 mt-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">CHOOSE AVATAR THEME COLOR</label>
              <div className="flex flex-wrap justify-center gap-2.5 mt-2.5">
                {colorPalette.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    className="w-7 h-7 rounded-full flex items-center justify-center border border-white/10 hover:scale-110 transition-transform active:scale-95 shadow-md relative"
                    style={{ backgroundColor: color }}
                  >
                    {avatarColor === color && (
                      <FiCheck className="text-white text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Username Field */}
          <div className="space-y-1">
            <label htmlFor="username" className="text-slate-600 dark:text-slate-300 text-sm font-medium">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <FiUser />
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900/50 border ${
                  errors.username ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                } rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all font-medium`}
              />
            </div>
            {errors.username && <p className="text-red-500 text-xs">{errors.username}</p>}
          </div>

          {/* Email Field */}
          <div className="space-y-1">
            <label htmlFor="email" className="text-slate-600 dark:text-slate-300 text-sm font-medium">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <FiMail />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900/50 border ${
                  errors.email ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                } rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all font-medium`}
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FiSave className="text-lg" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
