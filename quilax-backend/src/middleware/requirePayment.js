import prisma from "../lib/prisma.js";

export const requirePayment = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const completedPayment = await prisma.payment.findFirst({
      where: {
        userId,
        status: "COMPLETED",
      },
    });

    if (!completedPayment) {
      return res.status(403).json({
        error: "Se requiere un pago completado para acceder",
      });
    }

    next();
  } catch (error) {
    console.error("❌ Error en requirePayment:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
