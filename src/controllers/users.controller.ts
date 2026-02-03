import { Request, Response } from "express";
import { IUser , UserModel } from "../models/user.model";

export const getMyProfile = async(req: Request, res: Response) =>{
    try{
        const { username } = req.body;
        
        const user = await UserModel.findOne({ username });

        res.status(200).json({ message: `Profile data for user: ${username}`, data: user });
    }catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getUserProfile =  async (req: Request, res: Response) => {
    try{
        const { username } = req.params;

        const user = await UserModel.findOne({ username });

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

        if (!user || password !== user.password){
            return res.status(401).json({ message: "Invalid email or password" });
        }

        res.status(200).json({message : "User login Succesfuly"})
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const registerUser = async (req: Request, res: Response) => {
    try{
        const {firstName, lastName , username, email , password} = req.body;

        const existUser = await UserModel.findOne({email : email});

        if (existUser){
            return res.status(400).json({message : 'user already exists'});
        }

        const newUser = new UserModel({
            FName: firstName,
            LName: lastName,
            username,
            email,
            password
        })

        await newUser.save();

        res.status(201).json({ message: `User registered with username: ${username}` });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}