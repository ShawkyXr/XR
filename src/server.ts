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
import { router as roomsRouters } from './routes/rooms.route';
import { initSocket } from './socket';
  
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);


app.use('/api/profile', usersRouters);
app.use('/api/blog', blogsRouters);
app.use('/api/rooms', roomsRouters);
initSocket(server);


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