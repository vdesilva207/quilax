import express from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

/** Soft auth: attach req.user when Bearer token is valid; never fail. */
async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      const token = header.split(" ")[1];
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.id) {
          const user = await prisma.user.findUnique({ where: { id: decoded.id } });
          if (user && !user.isBanned) req.user = user;
        }
      }
    }
  } catch {
    // ignore invalid tokens for optional auth
  }
  next();
}

/**
 * Feed (ACTIVE posts, newest first)
 * GET /
 */
router.get("/", optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const posts = await prisma.post.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profilePhoto: true,
            profilePublic: true,
          },
        },
      },
    });

    // Hide posts from private profiles unless viewer is owner
    const viewerId = req.user?.id;
    const filtered = posts.filter(
      (p) => p.user.profilePublic || p.userId === viewerId
    );

    res.json({ posts: filtered });
  } catch (error) {
    console.error("Error listing posts feed:", error);
    res.status(500).json({ error: "Error al obtener posts" });
  }
});

/**
 * Posts by user
 * GET /user/:userId?limit=20
 */
router.get("/user/:userId", optionalAuth, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    if (!targetUserId) {
      return res.status(400).json({ error: "userId inválido" });
    }

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const viewerId = req.user?.id;

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, profilePublic: true },
    });

    if (!target) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const isOwner = viewerId === targetUserId;
    if (!target.profilePublic && !isOwner) {
      return res.json({ posts: [] });
    }

    const posts = await prisma.post.findMany({
      where: {
        userId: targetUserId,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.json({ posts });
  } catch (error) {
    console.error("Error listing user posts:", error);
    res.status(500).json({ error: "Error al obtener posts" });
  }
});

/**
 * Create post
 * POST /
 */
router.post("/", auth, async (req, res) => {
  try {
    const { text, imageUrl } = req.body || {};
    const trimmed = typeof text === "string" ? text.trim() : "";

    if (!trimmed && !imageUrl) {
      return res.status(400).json({ error: "text o imageUrl requerido" });
    }

    if (trimmed.length > 2000) {
      return res.status(400).json({ error: "Texto demasiado largo" });
    }

    const post = await prisma.post.create({
      data: {
        userId: req.user.id,
        text: trimmed || null,
        imageUrl: imageUrl || null,
        status: "ACTIVE",
      },
    });

    res.status(201).json({ success: true, post });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Error al crear post" });
  }
});

/**
 * Soft-delete post (owner only)
 * DELETE /:id
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (!postId) {
      return res.status(400).json({ error: "id inválido" });
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.status === "DELETED") {
      return res.status(404).json({ error: "Post no encontrado" });
    }

    if (post.userId !== req.user.id) {
      return res.status(403).json({ error: "No tienes permiso para borrar este post" });
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { status: "DELETED" },
    });

    res.json({ success: true, post: updated });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Error al borrar post" });
  }
});

/**
 * Report post → notify admins / log
 * POST /:id/report
 */
router.post("/:id/report", auth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { reason, description } = req.body || {};

    if (!postId) {
      return res.status(400).json({ error: "id inválido" });
    }
    if (!reason) {
      return res.status(400).json({ error: "reason requerido" });
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.status === "DELETED") {
      return res.status(404).json({ error: "Post no encontrado" });
    }

    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "ADMIN_WORKER"] } },
      select: { id: true },
      take: 20,
    });

    const body = [
      `Post #${postId} reportado por user #${req.user.id}`,
      `Razón: ${reason}`,
      description ? `Detalle: ${description}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: "POST_REPORT",
          title: "Reporte de post",
          body,
          data: {
            postId,
            reporterId: req.user.id,
            reason,
            description: description || null,
          },
        })),
      });
    } else {
      console.log("📮 Post report (no admins):", body);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error reporting post:", error);
    res.status(500).json({ error: "Error al reportar post" });
  }
});

export default router;
