import { Request, Response } from 'express';
import { IRoom, RoomModel } from '../models/room.model';
import { IUser, UserModel } from '../models/user.model';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants';

export const getAllRooms = async (req: Request, res: Response) => {
    try{
        const rooms: IRoom[] = await RoomModel.find().select('-accessCode');

        res.status(HTTP_STATUS.OK).json({ message: 'All rooms retrieved successfully', data: rooms });
    }catch (error: any) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_CODES.INTERNAL_ERROR, message: error.message || 'Internal Server Error' });
    }
}

export const getRoomById = async (req: Request, res: Response) => {
    try{
        const { roomId } = req.params;

        const room: IRoom | null = await RoomModel.findById(roomId);

        if (!room){
            return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_CODES.NOT_FOUND, message: 'Room not found' });
        }

        res.status(HTTP_STATUS.OK).json({ message: `Room with ID: ${roomId} retrieved successfully`, data: room });
    }catch (error: any) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_CODES.INTERNAL_ERROR, message: error.message || 'Internal Server Error' });
    }
}

export const createRoom = async (req: Request, res: Response) => {
    try{
        const { name, description, type, accessCode } = req.body;
        const username = (req as any).user.username;
        
        const user = await UserModel.findOne({ username });

        if (!username || !user) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_CODES.UNAUTHORIZED, message: 'Unauthorized User' });
        }
        
        if (!name){
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'Name is required' });
        }
        
        if (type === 'private' && !accessCode) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'Access code is required for private rooms' });
        }
        
        const newRoom = new RoomModel({
            name,
            description,
            type,
            accessCode: type === 'private' ? accessCode : null,
            createdBy: username
        });

        
        const savedRoom = await newRoom.save();
        
        user.roomsCreated.push(savedRoom._id.toString());
        await user.save();

        res.status(HTTP_STATUS.CREATED).json({ message: 'Room created successfully', data: savedRoom });
    }catch (error: any) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_CODES.INTERNAL_ERROR, message: error.message || 'Internal Server Error' });
    }
}

export const joinRoom = async (req: Request, res: Response) => {
    try{
        const { roomId } = req.params;
        const username = (req as any).user.username;
        let accessCode = null;
        
        if (!username){
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({error: ERROR_CODES.UNAUTHORIZED, message: 'Unauthorized User' });
        }

        const room = await RoomModel.findById(roomId);

        if (!room) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_CODES.NOT_FOUND, message: 'Room not found' });
        }

        const type = room.type;

        if (type === 'private') {
            accessCode = req.body.accessCode;
            
            if (!accessCode) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({error: ERROR_CODES.VALIDATION_ERROR, message: 'Access code is required for private rooms' });
            }
        }
        
        
        if (!room) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_CODES.NOT_FOUND, message: 'Room not found' });
        }

        if (room.type === 'private' && room.accessCode !== accessCode) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({ error: ERROR_CODES.FORBIDDEN, message: 'Invalid access code for private room' });
        }


        res.status(HTTP_STATUS.OK).json({ message: `Joined room: ${room.name} successfully`, data: room });
    }catch (error: any) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_CODES.INTERNAL_ERROR, message: error.message || 'Internal Server Error' });
    }
};

export const deleteRoom = async (req: Request, res: Response) => {
    try{
        const { roomId } = req.params;
        const username = (req as any).user.username;

        const user = await UserModel.findOne({ username });
        
        if (!username || !user) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_CODES.UNAUTHORIZED, message: 'Unauthorized User' });
        }

        const room = await RoomModel.findById(roomId);
        
        if (!room) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERROR_CODES.NOT_FOUND, message: 'Room not found' });
        }

        if (room.createdBy !== username) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({ error: ERROR_CODES.FORBIDDEN, message: 'Only the creator can delete this room' });
        }

        await RoomModel.findByIdAndDelete(roomId);

        user.roomsCreated = user.roomsCreated.filter(r => r !== roomId);
        await user.save();
        
        res.status(HTTP_STATUS.OK).json({ message: 'Room deleted successfully' });
    }catch (error: any) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_CODES.INTERNAL_ERROR, message: error.message || 'Internal Server Error' });
    }
};