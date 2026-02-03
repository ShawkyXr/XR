import { Schema, model } from 'mongoose';

export interface IComment {
    blogId: string;
    username: string;
    content: string;
    likes: number;
    createdAt?: Date;
}

const CommentSchema = new Schema<IComment>({
    blogId: { type: String, required: true },
    username: { type: String, required: true },
    content: { type: String, required: true },
    likes: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

export const CommentModel = model<IComment>('Comment', CommentSchema);
