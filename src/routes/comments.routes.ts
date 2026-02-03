import { Router } from 'express';
import { addComment, deleteComment } from '../controllers/comments.controller';

export const router = Router();

router.route('/:blogId')
    .post(addComment)
    .delete(deleteComment);