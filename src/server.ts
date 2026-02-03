import express from 'express';
import dotenv from 'dotenv';
import connectToDatabase from './config/database';
import { router as usersRouters } from './routes/users.routes';
import { router as blogsRouters } from './routes/blogs.routes';
import { router as commentsRouter } from './routes/comments.routes';
  
dotenv.config();
const app = express();
app.use(express.json());

connectToDatabase();

const PORT = process.env.PORT || 1234;

app.use('/', blogsRouters);
app.use('/profile', usersRouters);
app.use('/', commentsRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});