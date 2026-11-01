import express from "express";
import { auth } from "../middleware/auth.js";
import { requireMoneyEligibility } from "../middleware/moneyEligibility.js";
import {
  createManualDeposit,
  listMyManualDeposits,
  cancelManualDeposit,
  getManualDepositBankPublic,
} from "../services/manualDepositService.js";

const router = express.Router();

router.get("/bank-info", auth, (req, res) => {
  res.json(getManualDepositBankPublic());
});

router.get("/my", auth, async (req, res) => {
  try {
    const deposits = await listMyManualDeposits(req.user.id);
    res.json({ success: true, deposits });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post(
  "/create",
  auth,
  requireMoneyEligibility("DEPOSIT"),
  async (req, res) => {
    try {
      const credits = req.body?.credits ?? req.body?.amount;
      const result = await createManualDeposit(
        req.user.id,
        credits,
        req.body?.note,
      );
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("manual deposit create:", err);
      res.status(err.status || 400).json({ error: err.message });
    }
  },
);

router.post("/:id/cancel", auth, async (req, res) => {
  try {
    const deposit = await cancelManualDeposit(req.user.id, req.params.id);
    res.json({ success: true, deposit });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

export default router;
