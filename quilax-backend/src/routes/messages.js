import express from "express";
import {
  getInbox,
  getConversation,
  sendMessage,
  markRead,
  blockUser,
} from "../controllers/messageController.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.use(auth);

router.get("/", getInbox);
router.get("/:userId", getConversation);
router.post("/", sendMessage);
router.post("/:userId/read", markRead);
router.post("/:userId/block", blockUser);

export default router;