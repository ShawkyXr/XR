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
    profilePictureUrl?: string;
}

const UserSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    googleId: { type: String, unique: true, sparse: true },
    password: { type: String, required: function(this: IUser): boolean {
        return !this.googleId;
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