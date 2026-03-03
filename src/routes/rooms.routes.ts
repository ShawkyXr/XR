import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { validator, RoomSchema } from "../middlewares/validator.middleware";
import { getAllRooms, createRoom, getRoomById, joinRoom, deleteRoom } from "../controllers/rooms.controller";

export const router = Router();

router.route('/')
    .get(getAllRooms)
    .post(authenticate, validator(RoomSchema), createRoom);

router.route('/:roomId')
    .get(getRoomById)
    .post(authenticate, joinRoom)
    .delete(authenticate, deleteRoom);