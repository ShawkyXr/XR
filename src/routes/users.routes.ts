import { Router } from "express";
import multer from 'multer';
import passport from 'passport';
import { authenticate } from "../middlewares/auth.middleware";
import { generateToken } from '../utils/jwt.util';
import { validator, UserSchema, loginSchema } from "../middlewares/validator.middleware";
import { getMyProfile,
    getUserProfile,
    loginUser,
    registerUser,
    uploadProfilePicture,
    deleteProfilePicture
} from "../controllers/users.controller";
import {
    googleAuth,
    githubAuth
} from "../controllers/auth.controller";

export const router = Router();
const upload = multer({ dest: './src/uploads/' });
const CLIENT_URL = process.env.CLIENT_URL;

router.route("/login")
    .post(validator(loginSchema), loginUser);
    
router.route("/register")
    .post(validator(UserSchema), registerUser);

router.route("/auth/google")
    .get(passport.authenticate('google', { scope: ['profile', 'email'] }));

router.route("/auth/google/redirect")
    .get(
        passport.authenticate('google', { failureRedirect: `${CLIENT_URL}/?authError=google_login_failed` }),
        googleAuth
    );

router.route("/auth/github")
    .get(passport.authenticate('github', { scope: ['user:email'] }));

router.route("/auth/github/redirect")
    .get(
        passport.authenticate('github', { failureRedirect: `${CLIENT_URL}/?authError=github_login_failed` }),
        githubAuth
    );

router.route("/")
    .get(authenticate, getMyProfile);
    
router.route("/:username")
    .get(getUserProfile);

router.route("/profile-picture")
    .post(authenticate, upload.single('avatar'), uploadProfilePicture)
    .delete(authenticate, deleteProfilePicture);
