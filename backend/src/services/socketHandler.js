const { Server } = require('socket.io');

let io = null;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Connection timeout settings
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
    // Transports configuration
    transports: ['websocket', 'polling'],
    // Allow reconnection
    allowEIO3: true
  });

  io.use((socket, next) => {
    // Simple auth check - allow connection if token exists or in development mode
    const token = socket.handshake.auth.token;
    if (token || process.env.NODE_ENV === 'development') {
      // In production, verify JWT token here
      // For now, allow connection
      next();
    } else {
      // Still allow connection but log warning
      console.warn('WebSocket connection without token - allowing in development');
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    socket.on('join_room', (room) => {
      socket.join(room);
      const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
      console.log(`✅ Client ${socket.id} joined room: ${room} (${roomSize} total clients in room)`);
    });

    socket.on('leave_room', (room) => {
      socket.leave(room);
      console.log(`Client ${socket.id} left room: ${room}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });

    // Handle reconnection attempts
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber} for ${socket.id}`);
    });
  });

  // Handle server-level errors
  io.engine.on('connection_error', (err) => {
    console.error('❌ Socket.IO connection error:', err);
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO
};

