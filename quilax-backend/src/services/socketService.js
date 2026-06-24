import { getIO } from "../socket.js";

/*
====================================
EMIT NOTIFICACIÓN A USER
====================================
*/
export function emitNotification(userId, payload) {
  if (!userId || !payload) return;

  try {
    const io = getIO();
    io.to(`user:${userId}`).emit("notification", payload);
  } catch (err) {
    console.error("❌ emitNotification error:", err);
  }
}

/*
====================================
EMIT MENSAJE NUEVO
====================================
*/
export function emitMessage(userId, message) {
  if (!userId || !message) return;

  try {
    const io = getIO();
    io.to(`user:${userId}`).emit("new_message", message);
  } catch (err) {
    console.error("❌ emitMessage error:", err);
  }
}