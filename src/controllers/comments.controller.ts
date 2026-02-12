import { Request, Response } from "express";
import { Types } from "mongoose";
import { IComment, BlogModel } from "../models/blog.model";
import { HTTP_STATUS, ERROR_CODES } from "../config/constants";


export const addComment = async (req: Request, res: Response) =>{
    try{
        const blogId: string = req.params.blogId as string;
        const { content } = req.body;
        const username = (req as any).user.username;

        
        if (!blogId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'blogId parameter is required' });
        }

        if (!username ) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_CODES.VALIDATION_ERROR, message: ' content are required' });
        }

        if (!content) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'Content is required' });
        }
        
        const blog = await BlogModel.findById(blogId);

        if (!blog){
            return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_CODES.NOT_FOUND, message: 'Blog not found' });
        }

        const commentId = new Types.ObjectId();
        const comment: IComment = {
            _id: commentId,
            blogId,
            username,
            content,
            likes: []
        };

        blog.comments.push(comment);
        await blog.save();

        res.status(HTTP_STATUS.OK).json({message: 'Comment added successfully', data: comment});
    }catch(error: any){
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_CODES.INTERNAL_ERROR, message: error.message || 'Internal Server Error' });
    }
}

export const deleteComment = async (req: Request, res: Response) =>{
    try{
        const { blogId, commentId } = req.params;
        const username = (req as any).user.username;

        if (!username) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_CODES.UNAUTHORIZED, message: 'Unauthorized User' }); 
        }

        const blog = await BlogModel.findById(blogId);

        if (!blog){
            return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_CODES.NOT_FOUND, message: 'Blog not found' });
        }

        const comment = blog.comments.find((c: any) => c._id && c._id.equals(commentId));

        if (!comment){
            return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_CODES.NOT_FOUND, message: 'Comment not found' });
        }

        if (username !== comment.username){
            return res.status(HTTP_STATUS.FORBIDDEN).json({ error: ERROR_CODES.FORBIDDEN, message: 'You cannot delete this comment' });
        }
        
        const index = blog.comments.findIndex((c: any) => c._id && c._id.equals(commentId));

        if (~index){
            blog.comments.splice(index, 1);
            await blog.save();
        }

        res.status(HTTP_STATUS.OK).json({message: 'Comment deleted successfully'});
    }catch(error: any){
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_CODES.INTERNAL_ERROR, message: error.message || 'Internal Server Error' });
    }
}

export const likeComment = async (req: Request, res: Response) =>{
    try{
        const { blogId, commentId } = req.params;
        const username = (req as any).user.username;

        const blog = await BlogModel.findById(blogId);

        if (!blog){
            return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_CODES.NOT_FOUND, message: 'Blog not found' });
        }
        
        const comment = blog.comments.find((c: any) => c._id && c._id.equals(commentId));

        if (!comment){
            return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_CODES.NOT_FOUND, message: 'Comment not found' });
        }

        if (comment.likes.includes(username)) {
            comment.likes = comment.likes.filter((user: string) => user !== username);
            await blog.save();
            return res.status(HTTP_STATUS.OK).json({ message: 'Comment unliked successfully' });
        }

        comment.likes.push(username);
        await blog.save();

        res.status(HTTP_STATUS.OK).json({ message: 'Comment liked successfully', data: comment });
    }catch(error: any){
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_CODES.INTERNAL_ERROR, message: error.message || 'Internal Server Error' });
    }
}