import prisma from "../lib/prisma.js";

const ONE_HOUR = 1000 * 60 * 60;

async function cleanupPendingPayments() {
  const expirationDate = new Date(Date.now() - ONE_HOUR);

  const result = await prisma.payment.updateMany({
    where: {
      status: "PENDING",
      createdAt: {
        lt: expirationDate,
      },
    },
    data: {
      status: "EXPIRED",
    },
  });

  console.log(`🧹 Pagos PENDING expirados: ${result.count}`);
}

cleanupPendingPayments()
  .then(() => {
    console.log("✅ Limpieza completada");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error limpiando pagos:", err);
    process.exit(1);
  });
