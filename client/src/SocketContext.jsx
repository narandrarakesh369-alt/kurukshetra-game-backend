import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Detect environment and set server URL
    const isCapacitor = window.location.protocol === 'capacitor:' || window.location.protocol === 'https:' && window.location.hostname === 'localhost' && !window.location.port;
    const isDev = window.location.hostname === 'localhost' && window.location.port === '5173';
    
    let SERVER_URL;
    if (import.meta.env.VITE_SERVER_URL) {
      SERVER_URL = import.meta.env.VITE_SERVER_URL;
    } else if (isCapacitor) {
      SERVER_URL = 'https://kurukshetra-game-backend.onrender.com';
    } else if (isDev) {
      SERVER_URL = 'http://localhost:3001';
    } else {
      SERVER_URL = window.location.origin;
    }
    
    console.log('Connecting to server:', SERVER_URL);
    const newSocket = io(SERVER_URL);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to socket server:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from socket server');
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
