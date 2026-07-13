import express from "express";
import { auth } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router = express.Router();

// Follow user
router.post("/follow/:userId", auth, async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.userId);

    if (followerId === followingId) {
      return res.status(400).json({ error: "No puedes seguirte a ti mismo" });
    }

    const userToFollow = await prisma.user.findUnique({
      where: { id: followingId }
    });

    if (!userToFollow) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Verificar si ya sigue al usuario
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    if (existingFollow) {
      return res.status(400).json({ error: "Ya sigues a este usuario" });
    }

    // Crear follow
    await prisma.follow.create({
      data: {
        followerId,
        followingId
      }
    });

    res.json({
      success: true,
      message: "Usuario seguido exitosamente"
    });
  } catch (error) {
    console.error("Error following user:", error);
    res.status(500).json({ error: "Error al seguir usuario" });
  }
});

// Unfollow user
router.delete("/follow/:userId", auth, async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.userId);

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    if (!follow) {
      return res.status(404).json({ error: "No sigues a este usuario" });
    }

    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    res.json({
      success: true,
      message: "Usuario dejado de seguir exitosamente"
    });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    res.status(500).json({ error: "Error al dejar de seguir usuario" });
  }
});

// Get followers of a user
router.get("/followers/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              profilePhoto: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.follow.count({ where: { followingId: userId } })
    ]);

    res.json({
      success: true,
      followers: followers.map(f => f.follower),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting followers:", error);
    res.status(500).json({ error: "Error al obtener seguidores" });
  }
});

// Get following of a user
router.get("/following/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const skip = (page - 1) * limit;

    const [following, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              profilePhoto: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.follow.count({ where: { followerId: userId } })
    ]);

    res.json({
      success: true,
      following: following.map(f => f.following),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting following:", error);
    res.status(500).json({ error: "Error al obtener seguidos" });
  }
});

// Check if current user follows another user
router.get("/follow-status/:userId", auth, async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.userId);

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    res.json({
      success: true,
      isFollowing: !!follow
    });
  } catch (error) {
    console.error("Error checking follow status:", error);
    res.status(500).json({ error: "Error al verificar estado de seguimiento" });
  }
});

// Block user
router.post("/block/:userId", auth, async (req, res) => {
  try {
    const blockerId = req.user.id;
    const blockedId = parseInt(req.params.userId);

    if (blockerId === blockedId) {
      return res.status(400).json({ error: "No puedes bloquearte a ti mismo" });
    }

    const userToBlock = await prisma.user.findUnique({
      where: { id: blockedId }
    });

    if (!userToBlock) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Verificar si ya bloqueó al usuario
    const existingBlock = await prisma.userBlock.findFirst({
      where: {
        blockerId,
        blockedId
      }
    });

    if (existingBlock) {
      return res.status(400).json({ error: "Ya bloqueaste a este usuario" });
    }

    // Crear bloqueo
    await prisma.userBlock.create({
      data: {
        blockerId,
        blockedId
      }
    });

    // Dejar de seguir si lo seguía
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: blockedId },
          { followerId: blockedId, followingId: blockerId }
        ]
      }
    });

    res.json({
      success: true,
      message: "Usuario bloqueado exitosamente"
    });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ error: "Error al bloquear usuario" });
  }
});

// Unblock user
router.delete("/block/:userId", auth, async (req, res) => {
  try {
    const blockerId = req.user.id;
    const blockedId = parseInt(req.params.userId);

    const block = await prisma.userBlock.findFirst({
      where: {
        blockerId,
        blockedId
      }
    });

    if (!block) {
      return res.status(404).json({ error: "No has bloqueado a este usuario" });
    }

    await prisma.userBlock.delete({
      where: { id: block.id }
    });

    res.json({
      success: true,
      message: "Usuario desbloqueado exitosamente"
    });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ error: "Error al desbloquear usuario" });
  }
});

// Get blocked users
router.get("/blocked", auth, async (req, res) => {
  try {
    const blockerId = req.user.id;

    const blockedUsers = await prisma.userBlock.findMany({
      where: { blockerId },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profilePhoto: true
          }
        }
      }
    });

    res.json({
      success: true,
      blockedUsers: blockedUsers.map(b => b.blocked)
    });
  } catch (error) {
    console.error("Error getting blocked users:", error);
    res.status(500).json({ error: "Error al obtener usuarios bloqueados" });
  }
});

// Check if user is blocked
router.get("/block-status/:userId", auth, async (req, res) => {
  try {
    const blockerId = req.user.id;
    const blockedId = parseInt(req.params.userId);

    const block = await prisma.userBlock.findFirst({
      where: {
        blockerId,
        blockedId
      }
    });

    res.json({
      success: true,
      isBlocked: !!block
    });
  } catch (error) {
    console.error("Error checking block status:", error);
    res.status(500).json({ error: "Error al verificar estado de bloqueo" });
  }
});

export default router;
