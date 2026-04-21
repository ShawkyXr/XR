import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
dotenv.config();
import connectToDatabase from './config/database';
import { PORT } from './config/constants';
import './config/passport';
import { router as usersRouters } from './routes/users.routes';
import { router as blogsRouters } from './routes/blogs.routes';
import { router as roomsRouters } from './routes/rooms.routes';
import { initSocket } from './services/socket.service';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app = express();
app.use(cors());
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
}));
const server = http.createServer(app);


app.use('/api/profile', usersRouters);
app.use('/api/blog', blogsRouters);
app.use('/api/rooms', roomsRouters);
app.use(notFoundHandler);
app.use(errorHandler);

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