import express from 'express';
import http from 'http';
import cors from 'cors';
import socket from 'socket.io';
import dotenv from 'dotenv';
dotenv.config();
import connectToDatabase from './config/database';
import { PORT } from './config/constants';
import { router as usersRouters } from './routes/users.routes';
import { router as blogsRouters } from './routes/blogs.routes';
import { router as roomsRouters } from './routes/room.route';
  
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);


app.use('/api/profile', usersRouters);
app.use('/api/blog', blogsRouters);
app.use('/api/rooms', roomsRouters);

const io = new socket.Server(server, {
  cors: {
    origin: '*',
  },
});

// map of participants in each room
const roomParticipants: { [roomId: string]: any[] } = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', (data) => {
      const { roomId } = data;
      socket.join(roomId);

      data.currentUser.socketId = socket.id!;
      if (!roomParticipants[roomId]) {
          roomParticipants[roomId] = [];
      }

      roomParticipants[roomId].push(data.currentUser);
      io.to(roomId).emit('user-joined', { participants: roomParticipants[roomId] });
  });


  socket.on('send-message', (data) => {
    const { roomId } = data;
    console.log(`Received message from ${socket.id} in room ${roomId}: ${data.text}`);
    // Emit the full message data to all users in the room (including sender)
    io.to(roomId).emit('message', data);
  });


  socket.on('leave-room', (data) => {
    const { roomId } = data;
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}`);
    roomParticipants[roomId] = roomParticipants[roomId].filter((user) => user.socketId !== socket.id);
    io.to(roomId).emit('user-left', { participants: roomParticipants[roomId] });
  });

  socket.on('disconnect', (data) => {
    console.log('A user disconnected:', socket.id);
        for (const roomId in roomParticipants) {
            roomParticipants[roomId] = roomParticipants[roomId].filter((user) => user.socketId !== socket.id);
            io.to(roomId).emit('user-left', { participants: roomParticipants[roomId] });
        }
  });
});

connectToDatabase()
.then(() => {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
})
.catch((error) => {
  console.error('Failed to connect to database:', error);
  process.exit(1);
});