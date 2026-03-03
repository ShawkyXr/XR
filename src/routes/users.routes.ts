import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { validator, UserSchema, loginSchema } from "../middlewares/validator.middleware";
import { getMyProfile,
    getUserProfile,
    loginUser,
    registerUser
} from "../controllers/users.controller";

export const router = Router();

router.route("/login")
    .post(validator(loginSchema), loginUser);
    
router.route("/register")
    .post(validator(UserSchema), registerUser);

router.route("/")
    .get(authenticate, getMyProfile);
    
router.route("/:username")
    .get(getUserProfile);
