import { Schema, model } from 'mongoose';
import { IComment, CommentModel } from './comment.model';

export interface IBlog extends IComment {
    title: string;
    comments: IComment[];
}

const BlogSchema = new Schema<IBlog>({
    title: { type: String, required: true },
    username: { type: String, required: true },
    content: { type: String, required: true },
    likes: { type: [String], default: [] },
    comments: { type: [Object], default: [] },
    createdAt: { type: Date, default: Date.now }
});

export const BlogModel = model<IBlog>('Blog', BlogSchema);