import { Schema, model } from "mongoose";

export interface IUser {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    blogs: string[];
    token: string;
    room?: string | null;
    socketId?: string;
    createdAt?: Date;
}

const UserSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    token: { type: String},
    blogs: [{ type: String }],
    room: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

const UserModel = model<IUser>("User", UserSchema);

export { UserModel };