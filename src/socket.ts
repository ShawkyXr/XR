import { Server } from 'socket.io';
import { verifyToken } from './utils/jwt.util';

const roomParticipants: { [roomId: string]: any[] } = {};

export const initSocket = (server: any) => {

    const io = new Server(server,{
        cors: {origin: '*'}
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];

        if (!token) {
            return next(new Error('Authentication error: Token is required'));
        }
        try {
            const decoded = verifyToken(token);
            if (!decoded) {
                return next(new Error('Authentication error: Invalid or Expired token'));
            }
            socket.data.user = decoded;
            next();
        } catch (error) {
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
      console.log('A user connected:', socket.id);
    
      socket.on('join-room', (data) => {
          const { roomId } = data;
          
          if (!roomParticipants[roomId]) {
              roomParticipants[roomId] = [];
          }

          if (roomParticipants[roomId].some(user => user.username === data.currentUser.username)) {
            console.log(`User ${socket.id} is already in room ${roomId}`);
            socket.emit('already-in-room', { message: 'You are already in this room' });
            return;
          }

          socket.join(roomId);
    
          data.currentUser.socketId = socket.id!;
    
          roomParticipants[roomId].push(data.currentUser);
          io.to(roomId).emit('user-joined', { participants: roomParticipants[roomId] });
      });
    
    
      socket.on('send-message', (data) => {
        const { roomId } = data;
        console.log(`Received message from ${socket.id} in room ${roomId}: ${data.text}`);
        io.to(roomId).emit('message', data);
      });
    
    
      socket.on('leave-room', (data) => {
        const { roomId } = data;
        socket.leave(roomId);
        console.log(`User ${socket.id} left room ${roomId}`);
        if (roomParticipants[roomId]) {
          roomParticipants[roomId] = roomParticipants[roomId].filter(
            (user) => user.socketId !== socket.id
          );
          const updatedParticipants = roomParticipants[roomId];
          if (updatedParticipants.length === 0) {
            delete roomParticipants[roomId];
            io.to(roomId).emit('user-left', { participants: [] });
          } else {
            io.to(roomId).emit('user-left', { participants: updatedParticipants });
          }
        }
      });
    
      socket.on('disconnect', () => {
          console.log('A user disconnected:', socket.id);
          for (const roomId in roomParticipants) {
            roomParticipants[roomId] = roomParticipants[roomId].filter((user) => user.socketId !== socket.id );
            const updatedParticipants = roomParticipants[roomId];
            if (updatedParticipants.length === 0) {
              delete roomParticipants[roomId];
              io.to(roomId).emit('user-left', { participants: [] });
            } else {
              io.to(roomId).emit('user-left', { participants: updatedParticipants });
            }
          }
      });
    });
}