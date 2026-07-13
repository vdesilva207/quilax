import express from "express";
import prisma from "../lib/prisma.js";
import { auth, roleMiddleware } from "../middleware/auth.js";

const router = express.Router();

/**
 * Obtener historial del jackpot (ADMIN)
 */
router.get(
  "/history",
  auth,
  roleMiddleware(["ADMIN"]),
  async (req, res) => {
    try {
      // Obtener todas las transacciones que afectan al jackpot
      const jackpotTransactions = await prisma.transaction.findMany({
        where: {
          type: {
            in: ["QUIZ_JACKPOT", "SEASON_JACKPOT", "ADMIN_JACKPOT"]
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 100
      });

      // Calcular el total del jackpot actual
      const totalJackpot = jackpotTransactions.reduce((sum, tx) => {
        return tx.type.includes("JACKPOT") ? sum + tx.amount : sum;
      }, 0);

      // Formatear el historial
      const history = jackpotTransactions.map(tx => ({
        id: tx.id,
        amount: tx.amount,
        source: tx.type.replace("_JACKPOT", ""),
        description: tx.description || "Ingreso al jackpot",
        createdAt: tx.createdAt,
        quizId: tx.quizId,
        quizTitle: tx.quizId ? `Quiz #${tx.quizId}` : undefined
      }));

      res.json({
        success: true,
        history,
        totalJackpot
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
      // Calcular el total del jackpot
      const jackpotTransactions = await prisma.transaction.findMany({
        where: {
          type: {
            in: ["QUIZ_JACKPOT", "SEASON_JACKPOT", "ADMIN_JACKPOT"]
          }
        }
      });

      const totalJackpot = jackpotTransactions.reduce((sum, tx) => sum + tx.amount, 0);

      res.json({
        success: true,
        balance: totalJackpot
      });
    } catch (error) {
      console.error("Error fetching jackpot balance:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
