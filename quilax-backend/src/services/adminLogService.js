import prisma from "../lib/prisma.js";

export async function logAdminAction(adminId, action, targetType, targetId) {
  if (!adminId || !action || !targetType || !targetId) {
    throw new Error("Datos incompletos para log de acción admin");
  }

  return prisma.adminActionLog.create({
    data: { adminId, action, targetType, targetId },
  });
}