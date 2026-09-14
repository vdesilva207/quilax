import express from "express";
import prisma from "../lib/prisma.js";
import { auth, roleMiddleware } from "../middleware/auth.js";

const router = express.Router();

/**
 * Jackpot UI historically used QUIZ_JACKPOT / SEASON_JACKPOT / ADMIN_JACKPOT.
 * Schema only has PLATFORM_FEE for platform/jackpot-style deposits.
 */
const JACKPOT_TYPES = ["PLATFORM_FEE"];

/**
 * Obtener historial del jackpot (ADMIN)
 */
router.get(
  "/history",
  auth,
  roleMiddleware(["ADMIN"]),
  async (req, res) => {
    try {
      const jackpotTransactions = await prisma.transaction.findMany({
        where: {
          type: { in: JACKPOT_TYPES },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
        include: {
          quiz: { select: { id: true, title: true } },
        },
      });

      const totalJackpot = jackpotTransactions.reduce(
        (sum, tx) => sum + (tx.amount || 0),
        0
      );

      const history = jackpotTransactions.map((tx) => ({
        id: tx.id,
        amount: tx.amount,
        source: "PLATFORM",
        description: tx.description || "Ingreso al jackpot (platform fee)",
        createdAt: tx.createdAt,
        quizId: tx.quizId,
        quizTitle: tx.quiz?.title || (tx.quizId ? `Quiz #${tx.quizId}` : undefined),
      }));

      res.json({
        success: true,
        history,
        totalJackpot,
      });
    } catch (error) {
      console.error("Error fetching jackpot history:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * Obtener balance actual del jackpot (ADMIN)
 */
router.get(
  "/balance",
  auth,
  roleMiddleware(["ADMIN"]),
  async (req, res) => {
    try {
      const agg = await prisma.transaction.aggregate({
        where: { type: { in: JACKPOT_TYPES } },
        _sum: { amount: true },
      });

      res.json({
        success: true,
        balance: agg._sum.amount || 0,
      });
    } catch (error) {
      console.error("Error fetching jackpot balance:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
