import { Schema, model } from "mongoose";

export interface IRoom {
    name: string;
    createdBy: string;
    type: 'public' | 'private';
    description?: string;
    createdAt?: Date;
    accessCode?: string | null;
}

const RoomSchema = new Schema<IRoom>({
    name: { type: String, required: true, unique: true },
    createdBy: { type: String, required: true},
    type: { type: String, enum: ['public', 'private'], required: true },
    description: { type: String },
    accessCode: { type: String, sparse: true, default: null },
    createdAt: { type: Date, default: Date.now }
});

export const RoomModel = model<IRoom>("Room", RoomSchema);