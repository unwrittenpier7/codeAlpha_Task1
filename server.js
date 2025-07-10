const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.get('/', (req, res) => {
  res.send('Video Conference Server');
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

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
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));