import prisma from "../lib/prisma.js";

let schedulerInterval = null;

/**
 * Procesar cambios de contraseña pendientes
 */
async function processPendingPasswordChanges() {
  const now = new Date();

  // Buscar cambios de contraseña pendientes que deben activarse
  const pendingChanges = await prisma.adminAccess.findFirst();

  if (!pendingChanges || !pendingChanges.pendingPassword || !pendingChanges.changeScheduledAt) {
    return;
  }

  // Verificar si la fecha programada ha llegado
  if (now < pendingChanges.changeScheduledAt) {
    return;
  }

  console.log("🔑 Activando cambio de contraseña compartida programado");

  try {
    // Activar la nueva contraseña
    await prisma.adminAccess.update({
      where: { id: pendingChanges.id },
      data: {
        secretPassword: pendingChanges.pendingPassword,
        pendingPassword: null,
        changeScheduledAt: null
      }
    });

    console.log("✅ Contraseña compartida cambiada exitosamente");
  } catch (error) {
    console.error("❌ Error activando cambio de contraseña:", error);
  }
}

/**
 * Iniciar el scheduler de cambios de contraseña
 */
export function startPasswordChangeScheduler() {
  if (schedulerInterval) {
    console.log("⚠️ Password change scheduler already running");
    return;
  }

  console.log("🔄 Starting password change scheduler...");

  // Ejecutar cada hora
  schedulerInterval = setInterval(async () => {
    try {
      await processPendingPasswordChanges();
    } catch (error) {
      console.error("❌ Error in password change scheduler:", error);
    }
  }, 60 * 60 * 1000); // 1 hora

  console.log("✅ Password change scheduler started (runs every hour)");
}

/**
 * Detener el scheduler de cambios de contraseña
 */
export function stopPasswordChangeScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("⏹️ Password change scheduler stopped");
  }
}
