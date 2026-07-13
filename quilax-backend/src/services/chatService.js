import prisma from "../lib/prisma.js";
import { getIO } from "./socketService.js";

/*
====================================
SEND MESSAGE + REALTIME
====================================
*/
export async function sendMessage(fromUserId, toUserId, content) {
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

  const message = await prisma.message.create({
    data: { fromUserId, toUserId, content: content.trim() },
  });

  try {
    const io = getIO();
    io.to(`user:${toUserId}`).emit("new_message", message);
    io.to(`user:${fromUserId}`).emit("message_sent", message);
  } catch (err) {
    console.error("❌ Error emitiendo mensajes en tiempo real:", err);
  }

  return message;
}