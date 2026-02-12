import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { generateToken, verifyToken, JwtPayload } from "../utils/jwt.util";
import { IUser , UserModel } from "../models/user.model";
import { HTTP_STATUS, ERROR_CODES } from "../config/constants";

export const getMyProfile = async(req: Request, res: Response) =>{
    try{
        const username = req.user?.username;

        if (!username) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_CODES.UNAUTHORIZED, message : 'Unauthorized User' });
        }
        
        const user = await UserModel.findOne({ username }, '-password');

        res.status(HTTP_STATUS.OK).json({ message: `Profile data for user: ${username}`, data: user });
    }catch (error: any) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_CODES.INTERNAL_ERROR, message: error.message || 'Internal Server Error' });
    }
}


export const getUserProfile =  async (req: Request, res: Response) => {
    try{
        const { username } = req.params;

        if (!username) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_CODES.VALIDATION_ERROR, message : 'Username is required' });

        }

        const user = await UserModel.findOne({ username }, '-password');

        res.status(HTTP_STATUS.OK).json({ message: `Profile data for user: ${username}`, data: user });
    } catch (error: any) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_CODES.INTERNAL_ERROR, message: error.message || 'Internal Server Error' });
    }
}

export const loginUser = async (req: Request, res: Response) => {
    try{
        const { email, password, rememberMe } = req.body;

        if (!email || !password){
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_CODES.VALIDATION_ERROR, message : 'Email and password are required' });
        }

        const existUser = await UserModel.findOne({ email });

        const match = existUser ? await bcrypt.compare(password, existUser.password) : false;

        if (!match || !existUser){
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: ERROR_CODES.UNAUTHORIZED, message : 'Invalid email or password' });
        }

        const expireTime = rememberMe ? '7d' : '1h';

        const token = generateToken({ userId: existUser._id.toString(), email: existUser.email, username: existUser.username }, expireTime);
        
        const data = existUser.toObject();
        data.token = token;

        const { password: _, ...user } = data;
        
        res.status(HTTP_STATUS.OK).json({message : "User login Succesfuly", data : user});
    } catch (error: any) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_CODES.INTERNAL_ERROR, message: error.message || 'Internal Server Error' });
    }
}


export const registerUser = async (req: Request, res: Response) => {
    try{
        const {firstName, lastName , username, email , password} = req.body;

        if (!firstName || !lastName || !username || !email || !password){
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_CODES.VALIDATION_ERROR, message : "All fields are required" });
        }

        const existingUser = await UserModel.findOne({email : email});

        if (existingUser){
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_CODES.CONFLICT, message : 'This email already exists' });
        }

        const existingUsername = await UserModel.findOne({username : username});

        if (existingUsername){
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_CODES.CONFLICT, message : 'This username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new UserModel({
            firstName,
            lastName,
            username,
            email,
            password: hashedPassword
        })

        await newUser.save();

        res.status(HTTP_STATUS.CREATED).json({ message: `User registered with username: ${username}` });
    } catch (error: any) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_CODES.INTERNAL_ERROR, message: error.message || 'Internal Server Error' });
    }
}