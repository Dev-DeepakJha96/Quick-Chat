import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const ConversationList = () => {
  const { user } = useAuth();
  const { conversations, activeConversation, selectConversation, loading } = useChat();

  // Format last message time
  const formatTime = (date) => {
    if (!date) return '';
    const dateObj = new Date(date);
    const now = new Date();
    const diffInHours = (now - dateObj) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(dateObj, { addSuffix: true });
    }
    return format(dateObj, 'MMM d');
  };

  // Get other participant in conversation
  const getOtherParticipant = (conversation) => {
    if (!conversation.participants) return null;
    return conversation.participants.find(p => p._id !== user._id);
  };

  // Get avatar color for user
  const getAvatarColor = (participant) => {
    return participant?.avatarColor || '#6366f1';
  };

  // Get initials
  const getInitials = (name) => {
    return name?.[0]?.toUpperCase() || '?';
  };

  // Get online status
  const isUserOnline = (participant) => {
    return participant?.isOnline || false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 p-4">
        <div className="text-4xl mb-3">🗨️</div>
        <p className="text-center">No conversations yet</p>
        <p className="text-sm text-center mt-1">
          Search for users to start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((conversation) => {
        const otherParticipant = getOtherParticipant(conversation);
        const isActive = activeConversation?._id === conversation._id;
        const unreadCount = conversation.unreadCount || 0;

        return (
          <div
            key={conversation._id}
            onClick={() => selectConversation(conversation)}
            className={`
              px-4 py-3 cursor-pointer transition-all duration-200
              hover:bg-gray-50
              ${isActive ? 'bg-primary-50 border-l-4 border-primary-500' : ''}
            `}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                  style={{ backgroundColor: getAvatarColor(otherParticipant) }}
                >
                  {getInitials(otherParticipant?.username)}
                </div>
                {/* Online status dot */}
                {isUserOnline(otherParticipant) && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>

              {/* Conversation info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900 truncate">
                    {otherParticipant?.username || 'Unknown User'}
                  </p>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {formatTime(conversation.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 truncate">
                    {conversation.lastMessage?.text || 'No messages yet'}
                  </p>
                  {unreadCount > 0 && (
                    <span className="flex-shrink-0 ml-2 px-2 py-0.5 bg-primary-500 text-white text-xs font-medium rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConversationList;