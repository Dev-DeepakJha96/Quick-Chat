import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useSocket } from '../context/SocketContext';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import SearchUsers from '../components/chat/SearchUsers';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ChatPage = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const { activeConversation, conversations, loadConversations } = useChat();
  const [showSearch, setShowSearch] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reload conversations when socket connects
  useEffect(() => {
    if (isConnected) {
      loadConversations();
    }
  }, [isConnected, loadConversations]);

  // Handle logout
  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar / Conversation List */}
      <div
        className={`
          ${isMobile ? 'absolute inset-0 z-20 transition-transform duration-300' : 'relative w-96'}
          ${isMobile && !isMobileMenuOpen ? '-translate-x-full' : 'translate-x-0'}
          bg-white border-r flex flex-col shadow-lg
        `}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b bg-primary-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-xl font-bold uppercase">
                  {user?.username?.[0] || 'U'}
                </span>
              </div>
              <div>
                <div className="font-semibold">{user?.username}</div>
                <div className="text-xs text-white/80">
                  {isConnected ? '🟢 Online' : '🔴 Offline'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Search Toggle */}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Search users"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Search Users */}
        {showSearch && (
          <div className="p-4 border-b">
            <SearchUsers />
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList />
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {activeConversation ? (
          <ChatWindow />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-2xl font-semibold text-gray-600 mb-2">
              Welcome to Chat App
            </h2>
            <p className="text-center max-w-md">
              Select a conversation from the sidebar or search for users to start chatting
            </p>
            {!isConnected && (
              <div className="mt-4 flex items-center gap-2 text-yellow-600 bg-yellow-50 px-4 py-2 rounded-lg">
                <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                Connecting to chat server...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Menu Toggle */}
      {isMobile && (
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="fixed bottom-4 left-4 z-30 bg-primary-600 text-white p-3 rounded-full shadow-lg hover:bg-primary-700 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ChatPage;