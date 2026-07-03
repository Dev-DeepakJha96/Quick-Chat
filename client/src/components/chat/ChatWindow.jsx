import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import LoadingSpinner from '../common/LoadingSpinner';

const ChatWindow = () => {
  const { user } = useAuth();
  const { isConnected } = useSocket();
  const { 
    activeConversation, 
    messages, 
    loading,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
    messagesEndRef,
  } = useChat();

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Get other participant
  const getOtherParticipant = () => {
    if (!activeConversation?.participants) return null;
    return activeConversation.participants.find(p => p._id !== user._id);
  };

  const otherParticipant = getOtherParticipant();

  // Check if other user is typing
  const isOtherTyping = () => {
    if (!otherParticipant) return false;
    return typingUsers.has(otherParticipant._id);
  };

  // Handle typing
  const handleTyping = (isTypingNow) => {
    if (!activeConversation) return;

    if (isTypingNow && !isTyping) {
      setIsTyping(true);
      startTyping(activeConversation._id);
    }

    if (!isTypingNow && isTyping) {
      setIsTyping(false);
      stopTyping(activeConversation._id);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    if (isTypingNow) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        stopTyping(activeConversation._id);
      }, 2000);
    }
  };

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  if (!activeConversation) {
    return null;
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <div className="relative">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: otherParticipant?.avatarColor || '#6366f1' }}
          >
            {otherParticipant?.username?.[0]?.toUpperCase() || '?'}
          </div>
          {otherParticipant?.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">
            {otherParticipant?.username || 'Unknown User'}
          </h2>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-xs text-gray-500">
              {isConnected ? 'Online' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <MessageList />
      </div>

      {/* Typing Indicator */}
      {isOtherTyping() && (
        <div className="px-6 py-2 text-sm text-gray-500 bg-gray-50">
          {otherParticipant?.username} is typing...
        </div>
      )}

      {/* Message Input */}
      <MessageInput 
        onSend={sendMessage}
        onTyping={handleTyping}
        disabled={!isConnected}
      />
    </div>
  );
};

export default ChatWindow;