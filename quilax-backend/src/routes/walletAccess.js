import { Router } from "express";
import prisma from "../lib/prisma.js";
import { auth } from "../middleware/auth.js";
import { requirePlatform } from "../middleware/platform.js";
import { checkMoneyEligibility } from "../middleware/moneyEligibility.js";
import { generateAccessToken } from "../services/tokenService.js";
import { getBalance } from "../services/balanceService.js";
import { maskIban } from "../utils/bankData.js";

const router = Router();

router.use(auth, requirePlatform("wallet", "web", "ios", "android", "mobile", "desktop", "unknown"));

router.get("/status", async (req, res) => {
  try {
    const userId = req.user.id;
    const [user, depositCheck, withdrawCheck] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          username: true,
          balance: true,
          currency: true,
          isOver18: true,
          isBankVerified: true,
          bankAccountIban: true,
          bankAccountName: true,
          idVerified: true,
          stripeConnectAccountId: true,
        },
      }),
      checkMoneyEligibility(userId, "DEPOSIT"),
      checkMoneyEligibility(userId, "WITHDRAW"),
    ]);

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const hasConnect = !!user.stripeConnectAccountId;
    const hasBankAccount = !!user.bankAccountIban || hasConnect;

    res.json({
      success: true,
      balance: user.balance,
      currency: user.currency,
      eligibility: {
        canDeposit: depositCheck.allowed,
        canWithdraw: withdrawCheck.allowed,
        reasons: [depositCheck, withdrawCheck].filter((c) => !c.allowed).map((c) => c.reason),
      },
      verification: {
        isOver18: user.isOver18,
        isBankVerified: user.isBankVerified,
        hasBankAccount,
        idVerified: user.idVerified,
        hasConnectAccount: hasConnect,
      },
      bankAccount: user.bankAccountIban
        ? {
            ibanMasked: maskIban(user.bankAccountIban),
            accountName: user.bankAccountName,
          }
        : null,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        username: user.username,
      },
    });
  } catch (err) {
    console.error("wallet status error:", err);
    res.status(500).json({ error: "Error al obtener estado de wallet" });
  }
});

router.get("/limits", async (req, res) => {
  try {
    const settings = await prisma.systemSettings.findFirst();
    res.json({
      success: true,
      limits: {
        maxWithdrawPerTransaction: settings?.maxWithdrawPerTransaction ?? 500,
        maxWithdrawPerMonth: settings?.maxWithdrawPerMonth ?? 2000,
        largePrizeThreshold: settings?.largePrizeThreshold ?? 100,
      },
    });
  } catch (err) {
    console.error("wallet limits error:", err);
    res.status(500).json({ error: "Error al obtener límites" });
  }
});

router.post("/exchange-token", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const walletToken = generateAccessToken(user);
    res.json({
      success: true,
      token: walletToken,
      expiresIn: process.env.JWT_ACCESS_TTL || "7d",
    });
  } catch (err) {
    console.error("wallet exchange-token error:", err);
    res.status(500).json({ error: "Error al generar token de wallet" });
  }
});

router.post("/verify-session", async (req, res) => {
  try {
    const balance = await getBalance(req.user.id);
    const withdrawCheck = await checkMoneyEligibility(req.user.id, "WITHDRAW");
    res.json({
      success: true,
      valid: true,
      balance: balance.balance,
      currency: balance.currency,
      canWithdraw: withdrawCheck.allowed,
    });
  } catch (err) {
    console.error("wallet verify-session error:", err);
    res.status(500).json({ error: "Sesión inválida" });
  }
});

export default router;
