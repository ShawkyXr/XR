
import { Request, Response } from 'express';
import { IBlog, BlogModel } from '../models/blog.model';
import { IUser, UserModel } from '../models/user.model';

export const getAllBlogs = async (req: Request, res: Response) => {
    try {
        const blogs: IBlog[] = await BlogModel.find();
        res.status(200).json({ message: 'All blogs retrieved successfully', data: blogs });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getAllBlogsforUser = async (req: Request, res: Response) => {
    try {
        const { username } = req.params;
        const blogs: IBlog[] = await BlogModel.find({ username });
        res.status(200).json({ message: `All blogs for user ${username} retrieved successfully`, data: blogs });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

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
        const { title, content } = req.body;
        const username = (req as any).user.username;
        const userId = (req as any).user.userId;

        const user = await UserModel.findById(userId);

        if (!user){
            return res.status(404).json({ message: 'User not found' });
        }
        
        const newBlog = new BlogModel({
            title,
            username,
            content
        })

        user.blogs.push(newBlog._id.toString());
        await user.save();
        await newBlog.save();
        
        res.status(200).json({message: 'Blog is created', data: newBlog});
    }catch(error){
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


export const deleteBlogbyId = async (req : Request, res: Response) =>{
    try{
        const { blogId } = req.params;
        const username = (req as any).user.username;

        const blog = await BlogModel.findOne({ _id: blogId, username });
        
        if (!blog){
            return res.status(404).json({ message: 'Blog not found' });
        }

        if (blog.username !== username){
            return res.status(403).json({ message: 'Forbidden' });
        }

        await BlogModel.deleteOne({ _id: blogId, username });
        const userId = (req as any).user.userId;
        const user = await UserModel.findById(userId);

        if (user) {
            user.blogs = user.blogs.filter(blog => blog !== blogId.toString());
            await user.save();
        }

        res.status(200).json({message: 'Blog is deleted'});
    }catch(error){
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const editBlog = async (req: Request, res: Response) =>{
    try{
        const { title, content } = req.body;
        const { blogId } = req.params;
        const username = (req as any).user.username;

        const blog = await BlogModel.findOne({ _id: blogId, username });
        
        if (!blog){
            return res.status(404).json({ message: 'Blog not found' });
        }

        if (blog.username !== username){
            return res.status(403).json({ message: 'Forbidden' });
        }

        const updatedBlog = await BlogModel.updateOne(
            { _id: blogId, username },
            { $set: { title, content } }
        );
        res.status(200).json({message: 'Blog is updated'});
    }catch(error){
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


export const likeBlog = async (req: Request, res: Response) => {
    try {
        const { blogId } = req.params;
        const username = (req as any).user.username;


        const blog = await BlogModel.findById(blogId);

        
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        if (blog.likes.includes(username)) {
            blog.likes = blog.likes.filter((user) => user !== username);
            await blog.save();
            return res.status(200).json({ message: 'Blog unliked successfully' });
        }

        blog.likes.push(username);
        await blog.save();

        res.status(200).json({ message: 'Blog liked successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}