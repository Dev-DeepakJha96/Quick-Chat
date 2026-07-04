import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { isConnected, sendMessage: sendSocketMessage, startTyping, stopTyping, markMessageAsRead, joinConversation } = useSocket();
  
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [nextBefore, setNextBefore] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ====================
  // Load Conversations
  // ====================

  const loadConversations = useCallback(async () => {
    try {
      const response = await api.get('/conversations');
      setConversations(response.data.data.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    }
  }, []);

  // ====================
  // Load Messages
  // ====================

  const loadMessages = useCallback(async (conversationId, before = null) => {
    try {
      setLoading(true);
      const url = `/conversations/${conversationId}/messages?limit=50${before ? `&before=${before}` : ''}`;
      const response = await api.get(url);
      
      const newMessages = response.data.data.messages || [];
      const { hasMore, nextBefore: next } = response.data.data.pagination || {};
      
      if (before) {
        // Loading older messages (append to beginning)
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        // Loading fresh messages (replace all)
        setMessages(newMessages);
        // Mark messages as read
        if (newMessages.length > 0) {
          markMessagesAsRead(conversationId);
        }
      }
      
      setHasMoreMessages(hasMore);
      setNextBefore(next);
      
      return newMessages;
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ====================
  // Select Conversation
  // ====================

  const selectConversation = useCallback(async (conversation) => {
    if (!conversation) return;
    
    setActiveConversation(conversation);
    await loadMessages(conversation._id);
    
    // Join the conversation room via socket
    if (isConnected) {
      joinConversation(conversation._id);
    }
    
    // Scroll to bottom
    scrollToBottom();
  }, [loadMessages, joinConversation, isConnected]);

  // ====================
  // Send Message
  // ====================

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || !activeConversation) return;

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      _id: tempId,
      text: text.trim(),
      sender: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatarColor: user.avatarColor,
      },
      createdAt: new Date().toISOString(),
      isTemp: true,
      isSending: true,
    };

    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    try {
      // Send via socket
      const message = await sendSocketMessage(activeConversation._id, text.trim());
      
      // Replace temp message with real one
      setMessages(prev => prev.map(msg => 
        msg._id === tempId ? { ...message, isTemp: false, isSending: false } : msg
      ));

      // Update conversation list
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv._id === activeConversation._id) {
            return {
              ...conv,
              lastMessage: message,
              lastMessageAt: message.createdAt,
            };
          }
          return conv;
        });
        // Sort conversations by lastMessageAt
        return updated.sort((a, b) => 
          new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
        );
      });

    } catch (error) {
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      toast.error('Failed to send message');
    }
  }, [activeConversation, user, sendSocketMessage]);

  // ====================
  // Mark Messages as Read
  // ====================

  const markMessagesAsRead = useCallback(async (conversationId) => {
    try {
      await api.post('/messages/mark-read', { conversationId });
      
      // Update messages locally
      setMessages(prev => prev.map(msg => {
        if (msg.sender._id !== user._id && !msg.readBy?.some(r => r.user === user._id)) {
          return {
            ...msg,
            readBy: [...(msg.readBy || []), { user: user._id, readAt: new Date() }]
          };
        }
        return msg;
      }));
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, [user]);

  // ====================
  // Load More Messages
  // ====================

  const loadMoreMessages = useCallback(async () => {
    if (!activeConversation || !hasMoreMessages || loadingMore) return;
    
    setLoadingMore(true);
    await loadMessages(activeConversation._id, nextBefore);
    setLoadingMore(false);
  }, [activeConversation, hasMoreMessages, nextBefore, loadMessages]);

  // ====================
  // Search Users
  // ====================

  const searchUsers = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await api.get(`/users/search?q=${query}`);
      setSearchResults(response.data.data.users || []);
    } catch (error) {
      console.error('Failed to search users:', error);
      toast.error('Failed to search users');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // ====================
  // Create Conversation
  // ====================

  const createConversation = useCallback(async (participantId) => {
    try {
      const response = await api.post('/conversations', { participantId });
      const newConversation = response.data.data.conversation;
      
      // Check if conversation already exists in list
      const exists = conversations.some(c => c._id === newConversation._id);
      if (!exists) {
        setConversations(prev => [newConversation, ...prev]);
      }
      
      await selectConversation(newConversation);
      return newConversation;
    } catch (error) {
      toast.error('Failed to create conversation');
      throw error;
    }
  }, [conversations, selectConversation]);

  // ====================
  // Scroll to Bottom
  // ====================

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // ====================
  // Socket Event Listeners
  // ====================

  useEffect(() => {
    // Handle incoming messages
    const handleMessageReceive = (event) => {
      const { message, conversationId } = event.detail;
      
      // Update messages if active conversation
      if (activeConversation?._id === conversationId) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
        
        // Mark as read if not from self
        if (message.sender._id !== user._id) {
          markMessageAsRead(conversationId, message._id);
        }
      }
      
      // Update conversation list
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv._id === conversationId) {
            return {
              ...conv,
              lastMessage: message,
              lastMessageAt: message.createdAt,
              // Increment unread count if not active and not from self
              unreadCount: conv._id !== activeConversation?._id && message.sender._id !== user._id
                ? (conv.unreadCount || 0) + 1
                : (conv.unreadCount || 0),
            };
          }
          return conv;
        });
        return updated.sort((a, b) => 
          new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
        );
      });
    };

    // Handle typing indicators
    const handleTypingIndicator = (event) => {
      const { userId, username, isTyping } = event.detail;
      
      if (userId === user._id) return; // Ignore own typing
      
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        if (isTyping) {
          newMap.set(userId, { userId, username, isTyping });
        } else {
          newMap.delete(userId);
        }
        return newMap;
      });
    };

    // Handle user status changes
    const handleUserStatus = (event) => {
      // Update conversation list with status
      setConversations(prev => prev.map(conv => {
        const participants = conv.participants || [];
        const updatedParticipants = participants.map(p => {
          if (p._id === event.detail.userId) {
            return { ...p, isOnline: event.detail.isOnline };
          }
          return p;
        });
        return { ...conv, participants: updatedParticipants };
      }));
    };

    // Handle messages read
    const handleMessagesRead = (event) => {
      const { userId, conversationId } = event.detail;
      
      if (activeConversation?._id === conversationId) {
        setMessages(prev => prev.map(msg => {
          if (msg.sender._id !== user._id && !msg.readBy?.some(r => r.user === userId)) {
            return {
              ...msg,
              readBy: [...(msg.readBy || []), { user: userId, readAt: new Date() }]
            };
          }
          return msg;
        }));
      }
    };

    // Register event listeners
    window.addEventListener('message:receive', handleMessageReceive);
    window.addEventListener('typing:indicator', handleTypingIndicator);
    window.addEventListener('user:status', handleUserStatus);
    window.addEventListener('messages:read', handleMessagesRead);

    return () => {
      window.removeEventListener('message:receive', handleMessageReceive);
      window.removeEventListener('typing:indicator', handleTypingIndicator);
      window.removeEventListener('user:status', handleUserStatus);
      window.removeEventListener('messages:read', handleMessagesRead);
    };
  }, [activeConversation, user, markMessageAsRead, scrollToBottom]);

  // ====================
  // Initial Load
  // ====================

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const value = {
    conversations,
    activeConversation,
    messages,
    loading,
    loadingMore,
    hasMoreMessages,
    typingUsers,
    searchResults,
    searching,
    selectConversation,
    sendMessage,
    loadMoreMessages,
    searchUsers,
    createConversation,
    loadConversations,
    messagesEndRef,
    startTyping: (conversationId) => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      startTyping(conversationId);
    },
    stopTyping: (conversationId) => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping(conversationId);
    },
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};