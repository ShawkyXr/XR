import { Request, Response } from 'express';
import { IRoom, RoomModel } from '../models/room.model';

export const getAllRooms = async (req: Request, res: Response) => {
    try{
        const rooms: IRoom[] = await RoomModel.find();

        res.status(200).json({ message: 'All rooms retrieved successfully', data: rooms });
    }catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getRoomById = async (req: Request, res: Response) => {
    try{
        const { roomId } = req.params;

        const room: IRoom | null = await RoomModel.findById(roomId);

        if (!room){
            return res.status(404).json({ message: 'Room not found' });
        }

        res.status(200).json({ message: `Room with ID: ${roomId} retrieved successfully`, data: room });
    }catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const createRoom = async (req: Request, res: Response) => {
    try{
        const { name, description, maxParticipants, type } = req.body;
        const username = (req as any).user.username;
        
        if (!username) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        if (!name){
            return res.status(400).json({ message: 'Name is required' });
        }

        let code = null;

        if (type === 'private') {
            code = Math.random().toString(36).substring(2, 8).toUpperCase();

            let existCode = await RoomModel.findOne({ code });

            while (existCode) {
                code = Math.random().toString(36).substring(2, 8).toUpperCase();
                existCode = await RoomModel.findOne({ code });
            }
        }

        const newRoom = new RoomModel({
            name,
            description,
            maxParticipants,
            type,
            code,
            createdBy: username
        });

        await newRoom.save();
        res.status(201).json({ message: 'Room created successfully', data: newRoom });
    }catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const joinRoom = async (req: Request, res: Response) => {
    try{

        const { roomId, type } = req.params;
        const username = (req as any).user.username;
        let code = null;

        if (type === 'private') {
            code = req.body.code;

            if (!code) {
                return res.status(400).json({ message: 'Code is required for private rooms' });
            }
        }

        const room = await RoomModel.findById(roomId);
        
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (room.type === 'private' && room.code !== code) {
            return res.status(403).json({ message: 'Invalid code for private room' });
        }

        res.status(200).json({ message: `Joined room: ${room.name} successfully` });

    }catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


// useless for now, but can be used in the future to remove user from room participants list
export const leaveRoom = async (req: Request, res: Response) => {
    try{
        const { roomId } = req.params;
        const username = (req as any).user.username;

        const room = await RoomModel.findById(roomId);
        
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        res.status(200).json({ message: `Left room: ${room.name} successfully` });

    }catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// useless for now, but can be used in the future to allow room creators to delete their rooms
export const deleteRoom = async (req: Request, res: Response) => {
    try{
        const { roomId } = req.params;
        const username = (req as any).user.username;

        const room = await RoomModel.findById(roomId);
        
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (room.createdBy !== username) {
            return res.status(403).json({ message: 'Forbidden: Only the creator can delete this room' });
        }

        await RoomModel.findByIdAndDelete(roomId);
        res.status(200).json({ message: `Room: ${room.name} deleted successfully` });

    }catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};