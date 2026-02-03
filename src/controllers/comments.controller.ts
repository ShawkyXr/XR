import { Request, Response } from "express";
import { IComment, CommentModel } from "../models/comment.model";
import { IBlog, BlogModel } from "../models/blog.model";


export const addComment = async (req: Request, res: Response) =>{
    try{
        const blogId: string = req.params.blogId as string;
        if (!blogId) {
            return res.status(400).json({ message: 'blogId parameter is required' });
        }
        const { username, content } = req.body;

        const blog = await BlogModel.findById(blogId);

        if (!blog){
            return res.status(404).json({ message: 'Blog not found' });
        }

        blog.comments.push({blogId, username, content, likes: 0});
        await blog.save();

        res.status(200).json({message: 'Comment added successfully'});
    }catch(error){
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const deleteComment = async (req: Request, res: Response) =>{
    try{
        const { blogId, _id } = req.params;

        const blog = await BlogModel.findById(blogId);

        if (!blog){
            return res.status(404).json({ message: 'Blog not found' });
        }

        const comment = await CommentModel.findOne({_id});

        if (!comment){
            return res.status(404).json({ message: 'Comment not found' });
        }

        const index = blog.comments.findIndex((c: any) => c._id && comment._id && c._id.equals(comment._id));

        if (~index){
            blog.comments.splice(index, 1);
            await blog.save();
        }

        res.status(200).json({message: 'Comment deleted successfully'});
    }catch(error){
        res.status(500).json({ error: 'Internal Server Error' });
    }
}