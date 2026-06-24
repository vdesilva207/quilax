import express from "express";
import { getNotifications, markRead } from "../controllers/notificationController.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();
router.use(auth);

router.get("/", getNotifications);
router.post("/:id/read", markRead);

export default router;