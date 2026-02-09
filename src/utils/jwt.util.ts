import jwt, { SignOptions } from 'jsonwebtoken';
import { SECRET_KEY } from '../config/constants';
import { ObjectId } from 'mongoose';

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
}

export const generateToken = (payload: JwtPayload, expiresIn: SignOptions['expiresIn']): string => {
    return jwt.sign(payload, SECRET_KEY as string, { expiresIn });
}

export const verifyToken = (token: string): JwtPayload | null => {
    try {
        return jwt.verify(token, SECRET_KEY as string) as JwtPayload;
    } catch (error) {
        // console.error('Token verification failed:', error);
        return null;
    }
}