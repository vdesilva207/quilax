import { Router } from "express";
import { auth } from "../middleware/auth.js";
import * as service from "../services/messageService.js";

const router = Router();

router.use(auth);

router.post("/send", async (req, res) => {
  try {
    const msg = await service.sendUserMessage(
      req.user.id,
      req.body.toUserId,
      req.body.content
    );
    res.json(msg);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/conversation/:userId", async (req, res) => {
  const msgs = await service.getConversation(
    req.user.id,
    Number(req.params.userId)
  );
  res.json(msgs);
});

router.post("/block", async (req, res) => {
  await service.blockUser(req.user.id, req.body.userId);
  res.json({ ok: true });
});

router.post("/mute", async (req, res) => {
  await service.muteUser(req.user.id, req.body.userId);
  res.json({ ok: true });
});

export default router;