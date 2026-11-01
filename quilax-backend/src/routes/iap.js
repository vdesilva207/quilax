import express from "express";
import { auth } from "../middleware/auth.js";
import { requireMoneyEligibility } from "../middleware/moneyEligibility.js";
import {
  listIapPackages,
  verifyAndCreditIap,
} from "../services/iapService.js";

const router = express.Router();

router.get("/packages", auth, (_req, res) => {
  res.json({ success: true, packages: listIapPackages() });
});

/**
 * Body: { store: 'APPLE'|'GOOGLE', productId, storeTransactionId, receiptData? }
 */
router.post(
  "/verify",
  auth,
  requireMoneyEligibility("DEPOSIT"),
  async (req, res) => {
    try {
      const result = await verifyAndCreditIap({
        userId: req.user.id,
        store: req.body?.store,
        productId: req.body?.productId,
        storeTransactionId: req.body?.storeTransactionId,
        receiptData: req.body?.receiptData || req.body?.receipt || null,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("iap verify:", err);
      res.status(err.status || 400).json({ error: err.message });
    }
  },
);

export default router;
