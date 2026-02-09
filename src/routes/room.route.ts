import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { getAllRooms, createRoom, getRoomById, joinRoom, leaveRoom } from "../controllers/rooms.controller";

export const router = Router();

router.route('/')
    .get(getAllRooms)
    .post(authenticate, createRoom);

router.route('/:roomId')
    .get(getRoomById)
    .post(authenticate, joinRoom)
    .delete(authenticate, leaveRoom);