import { Router } from "express";
import { getMyProfile, getUserProfile, loginUser, registerUser } from "../controllers/users.controller";

export const router = Router();

router.route("/")
    .get(getMyProfile);

router.route("/profile/:username")
    .get(getUserProfile);

router.route("/login")
    .post(loginUser);

router.route("/register")
    .post(registerUser);