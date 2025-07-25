const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://code-alpha-task1-six.vercel.app',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.get('/', (req, res) => {
  res.send('🚀 Video Conference Server Running');
});

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // ✅ Join Room with displayName
  socket.on('join-room', (roomId, userId, displayName) => {
    socket.join(roomId);
    socket.data = { userId, displayName };

    // Notify others
    socket.to(roomId).emit('user-connected', userId, displayName);

    // Send full participants list
    const participants = [];
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    for (let clientId of clients) {
      const clientSocket = io.sockets.sockets.get(clientId);
      if (clientSocket?.data) {
        participants.push({
          id: clientSocket.id,
          name: clientSocket.data.displayName || 'Guest',
          muted: false,
        });
      }
    }

    io.to(roomId).emit('participants-update', participants);

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);

      // Send updated participants list
      const updated = [];
      const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
      for (let clientId of clients) {
        const clientSocket = io.sockets.sockets.get(clientId);
        if (clientSocket?.data) {
          updated.push({
            id: clientSocket.id,
            name: clientSocket.data.displayName || 'Guest',
            muted: false,
          });
        }
      }
      io.to(roomId).emit('participants-update', updated);
      console.log('❌ User disconnected:', userId);
    });
  });

  // ✅ WebRTC signaling
  socket.on('send-signal', (payload) => {
    io.to(payload.userToSignal).emit('receive-signal', {
      signal: payload.signal,
      callerId: payload.callerId,
    });
  });

  socket.on('return-signal', (payload) => {
    io.to(payload.id).emit('return-signal', payload);
  });

  // ✅ File sharing
  socket.on('send-file', ({ fileName, fileData, senderId, roomId }) => {
    socket.to(roomId).emit('receive-file', { fileName, fileData, senderId });
  });

  // ✅ Whiteboard drawing
  socket.on('send-drawing', ({ roomId, data }) => {
    socket.to(roomId).emit('receive-drawing', data);
  });

  // ✅ Chat messaging
  socket.on('chat-message', ({ sender, message }) => {
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    for (let roomId of rooms) {
      socket.to(roomId).emit('chat-message', { sender, message });
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Socket.IO server running on port ${PORT}`);
});
