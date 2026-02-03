
import { Request, Response } from 'express';
import { IBlog, BlogModel } from '../models/blog.model';

export const getAllBlogs = async (req: Request, res: Response) => {
    try {
        const blogs: IBlog[] = await BlogModel.find();
        res.status(200).json({ message: 'All blogs retrieved successfully', data: blogs });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getBlogbyId = async (req: Request, res: Response) => {
    try {
        const { blogId } = req.params;
        const blog: IBlog | null = await BlogModel.findById(blogId);

        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        res.status(200).json({ message: `Blog with ID: ${blogId} retrieved successfully`, data: blog });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const createBlog = async (req : Request, res: Response) =>{
    try{
        const { title, content, username } = req.body;


        const newBlog = new BlogModel({
            title,
            username,
            content
        })

        await newBlog.save();
        
        res.status(200).json({message: 'Blog is created'});
    }catch(error){
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


export const deleteBlogbyId = async (req : Request, res: Response) =>{
    try{
        const { blogId } = req.params;

        const deletedBlog = await BlogModel.deleteOne({_id: blogId});
        
        if (deletedBlog.deletedCount === 0){
            return res.status(404).json({ message: 'Blog not found' });
        }
        res.status(200).json({message: 'Blog is deleted'});
    }catch(error){
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const editBlog = async (req: Request, res: Response) =>{
    try{
        const { title, content, username } = req.body;
        const { blogId } = req.params;

        const updatedBlog = await BlogModel.updateOne({_id: blogId}, {$set: {title, content}});

        if (updatedBlog.matchedCount === 0){
            return res.status(404).json({ message: 'Blog not found' });
        }
        res.status(200).json({message: 'Blog is updated'});
    }catch(error){
        res.status(500).json({ error: 'Internal Server Error' });
    }
}