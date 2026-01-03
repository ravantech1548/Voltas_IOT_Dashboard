import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const useWebSocket = (room) => {
  const [socket, setSocket] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !room) return;

    const socketInstance = io(process.env.REACT_APP_WS_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      // Reconnection settings
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      forceNew: false,
      upgrade: true
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setConnected(true);
      socketInstance.emit('join_room', room);
    });

    socketInstance.on('sensor_update', (data) => {
      setLastMessage(data);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`WebSocket disconnected. Reason: ${reason}`);
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
      setConnected(true);
      if (room) {
        socketInstance.emit('join_room', room);
      }
    });

    socketInstance.on('reconnect_attempt', () => {
      setConnected(false);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
      setConnected(false);
    });

    return () => {
      if (socketInstance) {
        socketInstance.emit('leave_room', room);
        socketInstance.disconnect();
      }
    };
  }, [room]);

  return { socket, lastMessage, connected };
};

export default useWebSocket;


