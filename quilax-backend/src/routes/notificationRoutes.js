import { Router } from "express";
import { auth } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router = Router();

router.use(auth);

router.get("/", async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });

  res.json(notifications);
});

router.post("/read/:id", async (req, res) => {
  await prisma.notification.update({
    where: { id: Number(req.params.id) },
    data: { isRead: true },
  });

  res.json({ ok: true });
});

export default router;