import { Schema, model } from "mongoose";

export interface IUser {
    username: string;
    FName: string;
    LName: string;
    email: string;
    password: string;
    Blogs: string[];
    Room: string | null;
    createdAt?: Date;
}

const UserSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true },
    FName: { type: String, required: true },
    LName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const UserModel = model<IUser>("User", UserSchema);

export { UserModel };