import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { generateToken, verifyToken, JwtPayload } from "../utils/jwt.util";
import { IUser , UserModel } from "../models/user.model";

export const getMyProfile = async(req: Request, res: Response) =>{
    try{
        const username = req.user?.username;

        if (!username) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const user = await UserModel.findOne({ username }, '-password');

        res.status(200).json({ message: `Profile data for user: ${username}`, data: user });
    }catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


export const getUserProfile =  async (req: Request, res: Response) => {
    try{
        const { username } = req.params;

        if (!username) {
            return res.status(400).json({ message: 'Username parameter is required' });
        }

        const user = await UserModel.findOne({ username }, '-password');

        res.status(200).json({ message: `Profile data for user: ${username}`, data: user });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const loginUser = async (req: Request, res: Response) => {
    try{
        const { email, password } = req.body;

        if (!email || !password){
            return res.status(400).json({message : "Email and Password are required"});
        }

        const user = await UserModel.findOne({ email });

        const match = user ? await bcrypt.compare(password, user.password) : false;

        if (!match || !user){
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = generateToken({ userId: user._id.toString(), email: user.email, username: user.username }, '1h');

        res.status(200).json({message : "User login Succesfuly", token, user});
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


export const registerUser = async (req: Request, res: Response) => {
    try{
        const {firstName, lastName , username, email , password} = req.body;

        if (!firstName || !lastName || !username || !email || !password){
            return res.status(400).json({message : "All fields are required"});
        }

        const existingUser = await UserModel.findOne({email : email});

        if (existingUser){
            return res.status(400).json({message : 'This email already exists'});
        }

        const existingUsername = await UserModel.findOne({username : username});

        if (existingUsername){
            return res.status(400).json({message : 'This username already exists'});
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

        const token = generateToken({ userId: newUser._id.toString(), email: newUser.email, username: newUser.username }, '1h');
        newUser.token = token;


        res.status(201).json({ message: `User registered with username: ${username}`, token });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}