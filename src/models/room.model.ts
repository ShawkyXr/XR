import { Schema, model } from "mongoose";

export interface IRoom {
    name: string;
    createdBy: string;
    maxParticipants: number;
    type: 'public' | 'private';
    description?: string;
    createdAt?: Date;
    code?: string | null;
}

const RoomSchema = new Schema<IRoom>({
    name: { type: String, required: true, unique: true },
    createdBy: { type: String, required: true},
    maxParticipants: { type: Number, required: true },
    type: { type: String, enum: ['public', 'private'], required: true },
    description: { type: String },
    code: { type: String, unique: true, sparse: true, default: null },
    createdAt: { type: Date, default: Date.now }
});

export const RoomModel = model<IRoom>("Room", RoomSchema);