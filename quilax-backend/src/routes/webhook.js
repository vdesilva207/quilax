import express from "express";
import Stripe from "stripe";
import prisma from "../lib/prisma.js";
import { processStripeWebhook } from "../services/paymentService.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log("🔥 webhook.js cargado");

async function handleIdentityVerified(session) {
  const userIdFromMeta = session?.metadata?.userId
    ? parseInt(session.metadata.userId, 10)
    : null;

  let user = null;
  if (userIdFromMeta && !Number.isNaN(userIdFromMeta)) {
    user = await prisma.user.findUnique({ where: { id: userIdFromMeta } });
  }
  if (!user && session?.id) {
    user = await prisma.user.findFirst({
      where: { stripeIdentitySessionId: session.id },
    });
  }

  if (!user) {
    console.warn(
      `ℹ️ identity.verified pero sin usuario (session=${session?.id}, meta.userId=${session?.metadata?.userId})`
    );
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      idVerified: true,
      idVerifiedAt: new Date(),
      idDocumentType: "STRIPE_IDENTITY",
      livenessCompletedAt: new Date(),
      stripeIdentitySessionId: session.id,
    },
  });

  console.log(`✅ Identity verified for user ${user.id}`);
}

router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("📩 Webhook recibido");

    const sig = req.headers["stripe-signature"];
    let event;

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
      if (event.type?.startsWith("payment_intent.")) {
        await processStripeWebhook(event);
      } else if (event.type === "identity.verification_session.verified") {
        await handleIdentityVerified(event.data.object);
      } else if (
        event.type === "identity.verification_session.requires_input" ||
        event.type === "identity.verification_session.canceled" ||
        event.type === "identity.verification_session.redacted"
      ) {
        const session = event.data.object;
        console.log(
          `ℹ️ Identity session ${event.type}: id=${session?.id} status=${session?.status}`
        );
      } else {
        console.log(`ℹ️ Unhandled Stripe event: ${event.type}`);
      }
    } catch (err) {
      console.error("❌ Error en webhook:", err);
      // Always ack so Stripe does not hammer retries for app-level failures
    }

    return res.json({ received: true });
  }
);

export default router;
