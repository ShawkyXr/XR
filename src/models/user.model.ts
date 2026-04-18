import { Schema, model } from "mongoose";

export interface IUser {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    blogs: string[];
    token: string;
    roomsCreated: string[];
    socketId?: string;
    createdAt?: Date;
    googleId?: string;
    githubId?: string;
    profilePictureUrl?: string;
}

const UserSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String },
    email: { type: String, required: true, unique: true },
    googleId: { type: String, unique: true, sparse: true },
    githubId: { type: String, unique: true, sparse: true },
    password: { type: String, required: function(this: IUser): boolean {
        return !this.googleId && !this.githubId;
     }
    },
    token: { type: String},
    blogs: [{ type: String }],
    roomsCreated: [{ type: String, default: null }],
    createdAt: { type: Date, default: Date.now },
    profilePictureUrl: { type: String, default: null },
});

const UserModel = model<IUser>("User", UserSchema);

export { UserModel };