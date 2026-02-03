import { Router } from 'express';
import { getAllBlogs, getBlogbyId, createBlog, editBlog, deleteBlogbyId } from '../controllers/blogs.controller';

export const router = Router();

router.route('/')
    .get(getAllBlogs)
    .post(createBlog);

router.route('/:blogId')
    .get(getBlogbyId)
    .patch(editBlog)
    .delete(deleteBlogbyId);