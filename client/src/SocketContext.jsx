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
    // In production (same-origin), connect to current host. In dev, use localhost:3001
    const isDev = window.location.hostname === 'localhost' && window.location.port === '5173';
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || (isDev ? 'http://localhost:3001' : window.location.origin);
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
