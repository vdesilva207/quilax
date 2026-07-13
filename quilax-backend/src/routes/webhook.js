import express from "express";
import Stripe from "stripe";
import prisma from "../lib/prisma.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log("🔥 webhook.js cargado");

router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("📩 Webhook recibido");

    const sig = req.headers["stripe-signature"];
    let event;

    // 1️⃣ Verificar firma
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Error verificando webhook:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log("✅ Evento Stripe:", event.type);

    try {
      const intent = event.data.object;

      // 2️⃣ COMPLETADO
      if (event.type === "payment_intent.succeeded") {
        const result = await prisma.payment.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: { status: "COMPLETED" },
        });

        console.log(
          result.count
            ? `✅ Pago COMPLETED: ${intent.id}`
            : `ℹ️ COMPLETED recibido pero no existe en BD: ${intent.id}`
        );
      }

      // 3️⃣ FALLIDO
      else if (event.type === "payment_intent.payment_failed") {
        const result = await prisma.payment.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: { status: "FAILED" },
        });

        console.log(
          result.count
            ? `❌ Pago FAILED: ${intent.id}`
            : `ℹ️ FAILED recibido pero no existe en BD: ${intent.id}`
        );
      }

      // 4️⃣ CANCELADO
      else if (event.type === "payment_intent.canceled") {
        const result = await prisma.payment.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: { status: "CANCELLED" },
        });

        console.log(
          result.count
            ? `⚠️ Pago CANCELLED: ${intent.id}`
            : `ℹ️ CANCELLED recibido pero no existe en BD: ${intent.id}`
        );
      }
    } catch (err) {
      console.error("❌ Error en webhook:", err);
      return res.status(500).json({ error: "Webhook processing error" });
    }

    // 5️⃣ Confirmar a Stripe
    res.json({ received: true });
  }
);

export default router;
