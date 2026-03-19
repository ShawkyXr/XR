import { Router } from "express";
import multer from 'multer';
import { authenticate } from "../middlewares/auth.middleware";
import { validator, UserSchema, loginSchema } from "../middlewares/validator.middleware";
import { getMyProfile,
    getUserProfile,
    loginUser,
    registerUser,
    uploadProfilePicture,
    deleteProfilePicture
} from "../controllers/users.controller";

export const router = Router();
const upload = multer({ dest: './src/uploads/' });

router.route("/login")
    .post(validator(loginSchema), loginUser);
    
router.route("/register")
    .post(validator(UserSchema), registerUser);

router.route("/")
    .get(authenticate, getMyProfile);
    
router.route("/:username")
    .get(getUserProfile);

router.route("/profile-picture")
    .post(authenticate, upload.single('avatar'), uploadProfilePicture)
    .delete(authenticate, deleteProfilePicture);
