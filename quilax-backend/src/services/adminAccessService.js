import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

export function hasAdminPanelAccess(user) {
  return user?.role === "ADMIN" || user?.role === "ADMIN_WORKER";
}

export async function verifyAdminSecretPassword(plainPassword) {
  let adminAccess = await prisma.adminAccess.findFirst();

  if (!adminAccess) {
    const defaultPassword = process.env.ADMIN_SECRET_PASSWORD || "SoyPeruana6767.el207";
    adminAccess = await prisma.adminAccess.create({
      data: {
        secretPassword: await bcrypt.hash(defaultPassword, 10),
        createdBy: 1,
      },
    });
  }

  return bcrypt.compare(plainPassword, adminAccess.secretPassword);
}

export async function getAdminPersonalPasswordHash(user) {
  return user?.adminPassword || user?.password || "";
}
