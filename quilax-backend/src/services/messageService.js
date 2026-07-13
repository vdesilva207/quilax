import prisma from "../lib/prisma.js";

/*
====================================
SEND MESSAGE
====================================
*/
export async function sendUserMessage(fromUserId, toUserId, content) {
  if (!fromUserId || !toUserId || !content?.trim()) {
    throw new Error("Datos de mensaje inválidos");
  }

  const blocked = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: toUserId, blockedId: fromUserId },
        { blockerId: fromUserId, blockedId: toUserId },
      ],
    },
  });

  if (blocked) throw new Error("No puedes enviar mensajes a este usuario");

  return prisma.message.create({
    data: { fromUserId, toUserId, content: content.trim() },
  });
}

/*
====================================
CONVERSACIÓN
====================================
*/
export async function getConversation(userId, otherUserId) {
  return prisma.message.findMany({
    where: {
      OR: [
        { fromUserId: userId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: userId },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
}

/*
====================================
INBOX
====================================
*/
export async function getInbox(userId) {
  return prisma.message.findMany({
    where: { OR: [{ toUserId: userId }, { fromUserId: userId }] },
    orderBy: { createdAt: "desc" },
  });
}

/*
====================================
READ
====================================
*/
export async function markMessagesAsRead(userId, otherUserId) {
  return prisma.message.updateMany({
    where: { fromUserId: otherUserId, toUserId: userId, isRead: false },
    data: { isRead: true },
  });
}

/*
====================================
BLOCK
====================================
*/
export async function blockUser(blockerId, blockedId) {
  if (!blockerId || !blockedId) throw new Error("IDs de bloqueo inválidos");
  return prisma.userBlock.create({ data: { blockerId, blockedId } });
}