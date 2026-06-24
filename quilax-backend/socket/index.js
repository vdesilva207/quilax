import { Server } from "socket.io";

let io;

export function initSocket(server) {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("User conectado");

    socket.on("join", (userId) => {
      socket.join(`user_${userId}`);
    });

    socket.on("disconnect", () => {
      console.log("User desconectado");
    });
  });
}

export function getIO() {
  if (!io) throw new Error("Socket no inicializado");
  return io;
}