import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

function getServerUrl() {
  const isCapacitor = window.location.protocol === 'capacitor:' || (window.location.protocol === 'https:' && window.location.hostname === 'localhost' && !window.location.port);
  const isDev = window.location.hostname === 'localhost' && window.location.port === '5173';
  
  if (import.meta.env.VITE_SERVER_URL) return import.meta.env.VITE_SERVER_URL;
  if (isCapacitor) return 'https://kurukshetra-game-backend.onrender.com';
  if (isDev) return 'http://localhost:3001';
  return window.location.origin;
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  const createSocket = () => {
    // Close old socket if exists
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.close();
    }

    const SERVER_URL = getServerUrl();
    console.log('Connecting to server:', SERVER_URL);
    
    const newSocket = io(SERVER_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to socket server:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from socket server');
    });

    newSocket.on('connect_error', (err) => {
      console.log('Connection error, retrying...', err.message);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    return newSocket;
  };

  // Create socket on mount
  useEffect(() => {
    createSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.close();
      }
    };
  }, []);

  // Reconnect when app comes back from background (mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('App resumed - checking connection...');
        if (socketRef.current && !socketRef.current.connected) {
          console.log('Socket disconnected, reconnecting...');
          socketRef.current.connect();
        }
      }
    };

    const handleResume = () => {
      console.log('Capacitor resume event');
      if (socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('resume', handleResume);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('resume', handleResume);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, reconnect: createSocket }}>
      {children}
    </SocketContext.Provider>
  );
};
