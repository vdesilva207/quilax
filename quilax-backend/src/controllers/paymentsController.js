import prisma from "../lib/prisma.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPaymentIntent = async (req, res) => {
  try {
    const userId = req.user.id;

    const completed = await prisma.payment.findFirst({
      where: {
        userId,
        status: "COMPLETED",
      },
    });

    if (completed) {
      return res.status(409).json({
        error: "User already has premium",
      });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const pending = await prisma.payment.findFirst({
      where: {
        userId,
        status: "PENDING",
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (pending) {
      return res.status(409).json({
        error: "User already has a pending payment",
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000,
      currency: "usd",
      metadata: {
        userId: userId.toString(),
      },
    });

    await prisma.payment.create({
      data: {
        userId,
        amount: 1000,
        currency: "usd",
        stripePaymentIntentId: paymentIntent.id,
        status: "PENDING",
      },
    });

    return res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error("❌ createPaymentIntent error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
