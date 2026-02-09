import { Schema, model, Types } from 'mongoose';

export interface IComment {
    _id : Types.ObjectId;
    blogId: string;
    username: string;
    content: string;
    likes: string[];
    createdAt?: Date;
}

const CommentSchema = new Schema<IComment>({
    blogId: { type: String, required: true },
    username: { type: String, required: true },
    content: { type: String, required: true },
    likes: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now }
});

export const CommentModel = model<IComment>('Comment', CommentSchema);
