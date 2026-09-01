import prisma from "../lib/prisma.js";

export async function getSiteContent(key, fallback = null) {
  try {
    const row = await prisma.siteContent.findUnique({ where: { key } });
    const body = row?.body?.trim();
    return body ? row.body : fallback;
  } catch {
    return fallback;
  }
}

export async function setSiteContent(key, body, updatedBy = null) {
  return prisma.siteContent.upsert({
    where: { key },
    create: { key, body, updatedBy },
    update: { body, updatedBy },
  });
}

export async function getSiteContentMeta(key) {
  try {
    return await prisma.siteContent.findUnique({
      where: { key },
      select: { key: true, updatedAt: true, updatedBy: true },
    });
  } catch {
    return null;
  }
}
