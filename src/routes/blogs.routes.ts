import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { validator, BlogSchema, CommentSchema } from '../middlewares/validator.middleware';
import { getAllBlogs,
    getBlogbyId,
    likeBlog,
    createBlog,
    editBlog,
    deleteBlogbyId,
    getAllBlogsforUser
} from '../controllers/blogs.controller';
import { addComment,
    deleteComment,
    likeComment
 } from '../controllers/comments.controller';

export const router = Router();

router.route('/')
    .get(getAllBlogs)
    .post(authenticate, validator(BlogSchema), createBlog);

router.route('/user/:username')
    .get(getAllBlogsforUser);

router.route('/:blogId')
    .get(getBlogbyId)
    .post(authenticate, likeBlog)
    .patch(authenticate, validator(BlogSchema), editBlog)
    .delete(authenticate, deleteBlogbyId);

router.route('/:blogId/like')
    .post(authenticate, likeBlog);

router.route('/:blogId/comment')
    .post(authenticate, validator(CommentSchema), addComment);

router.route('/:blogId/comment/:commentId')
    .post(authenticate, likeComment)
    .delete(authenticate, deleteComment);