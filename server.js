const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// ✅ Update CORS to allow both local & Vercel origins
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000', // local dev
      'https://code-alpha-task1-six.vercel.app' // your deployed frontend
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.get('/', (req, res) => {
  res.send('Video Conference Server Running 🚀');
});

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });

  socket.on('send-signal', (payload) => {
    io.to(payload.userToSignal).emit('receive-signal', {
      signal: payload.signal,
      callerId: payload.callerId,
    });
  });

  socket.on('return-signal', (payload) => {
    io.to(payload.id).emit('return-signal', payload);
  });

  socket.on('send-file', ({ fileName, fileUrl, senderId, roomId }) => {
    socket.to(roomId).emit('receive-file', { fileName, fileUrl, senderId });
  });

  socket.on('send-drawing', ({ roomId, data }) => {
    socket.to(roomId).emit('receive-drawing', data);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Socket.IO server running on port ${PORT}`);
});
