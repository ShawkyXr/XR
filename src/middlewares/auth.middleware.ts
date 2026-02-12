import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.util';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || req.headers.Authorization as string;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_CODES.UNAUTHORIZED, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyToken(token) as JwtPayload;
        if (!decoded) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_CODES.UNAUTHORIZED, message: 'Invalid or Expired token' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_CODES.UNAUTHORIZED, message: 'Invalid token' });
    }
}