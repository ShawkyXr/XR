import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { getMyProfile,
    getUserProfile,
    loginUser,
    registerUser
} from "../controllers/users.controller";

export const router = Router();

router.route("/login")
    .post(loginUser);
    
router.route("/register")
    .post(registerUser);

router.route("/")
    .get(authenticate, getMyProfile);
    
router.route("/:username")
    .get(getUserProfile);
