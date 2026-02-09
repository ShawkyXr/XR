import { Schema, model } from "mongoose";

export interface IMessage {
    sender: string;
    content: string;
    roomId: string;
    sentAt?: Date;
}

const MessageSchema = new Schema<IMessage>({
    sender: { type: String, required: true },
    content: { type: String, required: true },
    roomId: { type: String, required: true },
    sentAt: { type: Date, default: Date.now }
});

export const MessageModel = model<IMessage>("Message", MessageSchema);