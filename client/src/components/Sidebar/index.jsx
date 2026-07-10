import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import Avatar from '../UI/Avatar';
import { formatMessageTime } from '../../utils/date';
import {
  FiSearch,
  FiLogOut,
  FiUser,
  FiSettings,
  FiX,
  FiMessageSquare,
  FiTrash2,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService } from '../../services/chat';

const Sidebar = ({ onMobileClose }) => {
  const { user, logout } = useAuth();
  const {
    conversations,
    activeConversation,
    selectConversation,
    typingUsers,
    startNewChat,
    deleteConversationHistory,
  } = useChat();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation? This will remove it from your inbox. The other participant will still see it.')) {
      await deleteConversationHistory(convId);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Debounced search trigger
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    setLoadingSearch(true);

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await chatService.searchUsers(searchQuery);
        if (response.success && response.data?.users) {
          setSearchResults(response.data.users);
        }
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoadingSearch(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectSearchResult = async (searchedUser) => {
    setSearchQuery('');
    setSearching(false);
    await startNewChat(searchedUser._id);
    if (onMobileClose) onMobileClose(); // close sidebar drawer on mobile
  };

  const handleSelectConversation = (conv) => {
    selectConversation(conv);
    if (onMobileClose) onMobileClose();
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await logout();
      navigate('/login');
    }
  };

  // Helper to get the other participant in 1-to-1 conversation
  const getOtherParticipant = useCallback(
    (conv) => {
      if (!conv || !conv.participants) return null;
      return conv.participants.find((p) => p._id !== user?._id);
    },
    [user]
  );

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 select-none transition-colors duration-200">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/profile')}>
          <Avatar user={user} size="md" showStatus={true} />
          <div className="max-w-[120px]">
            <h2 className="text-sm font-semibold truncate text-slate-850 dark:text-slate-100">@{user?.username}</h2>
            <p className="text-xs text-emerald-500 font-medium">Online</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {/* Profile */}
          <button
            onClick={() => navigate('/profile')}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            title="My Profile"
          >
            <FiUser className="text-lg" />
          </button>

          {/* Settings */}
          <button
            onClick={() => navigate('/settings')}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            title="Settings"
          >
            <FiSettings className="text-lg" />
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 text-slate-550 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
            title="Log Out"
          >
            <FiLogOut className="text-lg" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <FiSearch />
          </span>
          <input
            type="text"
            placeholder="Search users by username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <FiX />
            </button>
          )}
        </div>
      </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-4">
        <AnimatePresence mode="wait">
          {searching ? (
            /* Search Results View */
            <motion.div
              key="search-results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-1"
            >
              <p className="text-slate-400 dark:text-slate-500 text-xs px-2 mb-2 font-semibold tracking-wider">SEARCH RESULTS</p>
              {loadingSearch ? (
                /* Loading State */
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex items-center space-x-3 animate-pulse py-2">
                      <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((searchUser) => (
                  <div
                    key={searchUser._id}
                    onClick={() => handleSelectSearchResult(searchUser)}
                    className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                  >
                    <Avatar user={searchUser} size="md" showStatus={true} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-850 dark:text-white truncate">@{searchUser.username}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{searchUser.email}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-sm font-medium">No users found</p>
                  <p className="text-xs mt-1">Try another username or email</p>
                </div>
              )}
            </motion.div>
          ) : (
            /* Recent Conversations View */
            <motion.div
              key="chats-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between px-2 mb-2">
                <p className="text-slate-500 text-xs font-semibold tracking-wider">DIRECT MESSAGES</p>
              </div>
              {conversations.length > 0 ? (
                conversations.map((conv) => {
                  const otherUser = getOtherParticipant(conv);
                  if (!otherUser) return null;

                  const isActive = activeConversation?._id === conv._id;
                  const typingMap = typingUsers[conv._id] || {};
                  const isTyping = Object.keys(typingMap).length > 0;
                  const typingText = Object.values(typingMap).join(', ') + ' typing...';

                  const lastMessage = conv.lastMessage;
                  const isOwnLastMessage = lastMessage?.sender?._id === user?._id || lastMessage?.sender === user?._id;
                  
                  // Format last message content
                  let messageSnippet = '';
                  if (lastMessage) {
                    if (lastMessage.isDeleted) {
                      messageSnippet = 'This message was deleted';
                    } else if (lastMessage.text) {
                      // Check if message is a file upload
                      if (lastMessage.text.startsWith('/uploads/')) {
                        messageSnippet = isOwnLastMessage ? 'Sent a file' : 'Sent a file';
                      } else {
                        messageSnippet = lastMessage.text;
                      }
                    }
                  }

                  return (
                    <div
                      key={conv._id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all border group/conv ${
                        isActive
                          ? 'bg-blue-500/5 border-blue-500/25 text-blue-600 dark:bg-blue-600/10 dark:border-blue-500/30 dark:text-white'
                          : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Avatar user={otherUser} size="md" showStatus={true} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <p className={`text-sm font-semibold truncate ${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-slate-850 dark:text-slate-100'}`}>
                            @{otherUser.username}
                          </p>
                          {conv.lastMessageAt && (
                            <span className="text-[10px] text-slate-500 font-medium shrink-0 ml-1">
                              {formatMessageTime(conv.lastMessageAt)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center">
                          {isTyping ? (
                            <p className="text-xs text-emerald-500 dark:text-emerald-400 font-medium animate-pulse truncate">
                              {typingText}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate pr-2">
                              {lastMessage ? (
                                <>
                                  {isOwnLastMessage && <span className="text-slate-400 dark:text-slate-505 font-semibold mr-1">You:</span>}
                                  {messageSnippet}
                                </>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-650 italic">No messages yet</span>
                              )}
                            </p>
                          )}

                          <div className="flex items-center space-x-1.5 shrink-0 ml-1">
                            {conv.unreadCount > 0 && !isActive && (
                              <span className="bg-emerald-500 text-slate-900 text-[10px] font-extrabold h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center">
                                {conv.unreadCount}
                              </span>
                            )}
                            <button
                              onClick={(e) => handleDeleteConversation(e, conv._id)}
                              className="opacity-100 md:opacity-0 md:group-hover/conv:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all"
                              title="Delete Chat"
                            >
                              <FiTrash2 size={13.5} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-500 px-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800/50 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <FiMessageSquare className="text-lg text-slate-400" />
                  </div>
                  <p className="text-sm font-medium">No conversations yet</p>
                  <p className="text-xs mt-1">Search for a username above to start chatting!</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Sidebar;
