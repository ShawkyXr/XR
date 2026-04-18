import {Request, Response} from 'express';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants';
import { generateToken } from '../utils/jwt.util';

const CLIENT_URL = process.env.CLIENT_URL;

export const googleAuth = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.redirect(`${CLIENT_URL}/?authError=google_login_failed`);
        }

        const token = generateToken(
            {
                userId: req.user.userId,
                email: req.user.email,
                username: req.user.username
            },
            '7d'
        );

        return res.redirect(`${CLIENT_URL}/?token=${encodeURIComponent(token)}`);
    } catch (error: any) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_CODES.INTERNAL_ERROR, message: error.message || 'Internal Server Error' });
    }
}