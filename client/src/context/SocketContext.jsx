import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const socketRef = useRef(null);
  const { user, isAuthenticated } = useAuth();
  const reconnectAttempts = useRef(0);

  /**
   * Initialize socket connection
   */
  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Get token from cookie
    const getToken = () => {
      const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='));
      return cookie ? cookie.split('=')[1] : null;
    };

    const token = getToken();
    if (!token) {
      console.warn('No token found for socket connection');
      return;
    }

    // Initialize socket
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    // Connection events
    socketRef.current.on('connect', () => {
      console.log('🔌 Socket connected');
      setIsConnected(true);
      reconnectAttempts.current = 0;
      toast.success('Connected to chat server', { duration: 2000 });
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, attempt reconnection
        socketRef.current.connect();
      }
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      reconnectAttempts.current += 1;
      
      if (reconnectAttempts.current >= 5) {
        toast.error('Connection lost. Please refresh the page.');
      }
    });

    socketRef.current.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      toast.success('Reconnected to chat server', { duration: 2000 });
    });

    // ====================
    // Message Event Handlers
    // ====================

    /**
     * Handle incoming messages
     */
    socketRef.current.on('message:receive', (data) => {
      console.log('📨 New message received:', data);
      // This will be handled by ChatContext
      window.dispatchEvent(new CustomEvent('message:receive', { detail: data }));
    });

    /**
     * Handle message read receipts
     */
    socketRef.current.on('message:readReceipt', (data) => {
      console.log('👀 Message read:', data);
      window.dispatchEvent(new CustomEvent('message:readReceipt', { detail: data }));
    });

    /**
     * Handle all messages read
     */
    socketRef.current.on('messages:read', (data) => {
      console.log('✅ All messages read:', data);
      window.dispatchEvent(new CustomEvent('messages:read', { detail: data }));
    });

    // ====================
    // Typing Event Handlers
    // ====================

    /**
     * Handle typing indicators
     */
    socketRef.current.on('typing:indicator', (data) => {
      window.dispatchEvent(new CustomEvent('typing:indicator', { detail: data }));
    });

    // ====================
    // User Status Event Handlers
    // ====================

    /**
     * Handle user online/offline status
     */
    socketRef.current.on('user:status', (data) => {
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        if (data.isOnline) {
          newMap.set(data.userId, data);
        } else {
          newMap.delete(data.userId);
        }
        return newMap;
      });
      
      // Also dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('user:status', { detail: data }));
    });

    // ====================
    // Conversation Events
    // ====================

    socketRef.current.on('conversations:joined', (data) => {
      console.log('📋 Joined conversations:', data);
      window.dispatchEvent(new CustomEvent('conversations:joined', { detail: data }));
    });

    socketRef.current.on('conversation:joined', (data) => {
      console.log('📋 Joined conversation:', data);
      window.dispatchEvent(new CustomEvent('conversation:joined', { detail: data }));
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [isAuthenticated, user]);

  // ====================
  // Socket Actions
  // ====================

  /**
   * Send a message
   */
  const sendMessage = useCallback((conversationId, text) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      socketRef.current.emit('message:send', { conversationId, text }, (response) => {
        if (response.success) {
          resolve(response.message);
        } else {
          reject(new Error(response.error || 'Failed to send message'));
        }
      });
    });
  }, [isConnected]);

  /**
   * Start typing indicator
   */
  const startTyping = useCallback((conversationId) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('typing:start', { conversationId });
  }, [isConnected]);

  /**
   * Stop typing indicator
   */
  const stopTyping = useCallback((conversationId) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('typing:stop', { conversationId });
  }, [isConnected]);

  /**
   * Mark message as read
   */
  const markMessageAsRead = useCallback((conversationId, messageId) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('message:read', { conversationId, messageId });
  }, [isConnected]);

  /**
   * Join a conversation room
   */
  const joinConversation = useCallback((conversationId) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('conversation:join', { conversationId });
  }, [isConnected]);

  /**
   * Leave a conversation room
   */
  const leaveConversation = useCallback((conversationId) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('conversation:leave', { conversationId });
  }, [isConnected]);

  const value = {
    socket: socketRef.current,
    isConnected,
    onlineUsers,
    sendMessage,
    startTyping,
    stopTyping,
    markMessageAsRead,
    joinConversation,
    leaveConversation,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};