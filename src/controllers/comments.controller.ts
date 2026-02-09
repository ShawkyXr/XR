import { Request, Response } from "express";
import { IBlog, BlogModel } from "../models/blog.model";
import { Types } from "mongoose";


export const addComment = async (req: Request, res: Response) =>{
    try{
        const blogId: string = req.params.blogId as string;
        const { content } = req.body;
        const username = (req as any).user.username;

        const commentId = new Types.ObjectId();

        if (!blogId) {
            return res.status(400).json({ message: 'blogId parameter is required' });
        }

        if (!username ) {
            return res.status(400).json({ message: ' content are required' });
        }

        const blog = await BlogModel.findById(blogId);

        if (!blog){
            return res.status(404).json({ message: 'Blog not found' });
        }

        blog.comments.push({ _id: commentId, blogId, username, content, likes: [] });
        await blog.save();

        res.status(200).json({message: 'Comment added successfully'});
    }catch(error){
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const deleteComment = async (req: Request, res: Response) =>{
    try{
        const { blogId, commentId } = req.params;

        const blog = await BlogModel.findById(blogId);

        if (!blog){
            return res.status(404).json({ message: 'Blog not found' });
        }

        const comment = blog.comments.find((c: any) => c._id && c._id.equals(commentId));

        if (!comment){
            return res.status(404).json({ message: 'Comment not found' });
        }
        
        const index = blog.comments.findIndex((c: any) => c._id && c._id.equals(commentId));

        if (~index){
            blog.comments.splice(index, 1);
            await blog.save();
        }

        res.status(200).json({message: 'Comment deleted successfully'});
    }catch(error){
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const likeComment = async (req: Request, res: Response) =>{
    try{
        const { blogId, _id } = req.params;
        const username = (req as any).user.username;

        const blog = await BlogModel.findById(blogId);

        if (!blog){
            return res.status(404).json({ message: 'Blog not found' });
        }
        
        const comment = blog.comments.find((c: any) => c._id && c._id.equals(_id));

        if (!comment){
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (comment.likes.includes(username)) {
            comment.likes = comment.likes.filter((user) => user !== username);
            await blog.save();
            return res.status(200).json({ message: 'Comment unliked successfully' });
        }

        comment.likes.push(username);
        await blog.save();
        
        res.status(200).json({message: 'Comment liked successfully'});
    }catch(error){
        res.status(500).json({ error: 'Internal Server Error' });
    }
}