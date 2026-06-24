const { createServer } = require('http');
const { Server } = require('socket.io');
const { redisPub, redisSub } = require('./redis');
const cluster = require('cluster');
const os = require('os');

// Configuración de Socket.IO con Redis adapter para clustering
const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    maxHttpBufferSize: 1e6, // 1MB
    perMessageDeflate: {
      threshold: 1024,
      zlib: {},
    },
  });

  // Redis adapter para clustering
  if (cluster.isMaster) {
    // Solo en master para evitar múltiples instancias
    const { createAdapter } = require('@socket.io/redis-adapter');
    const pubClient = redisPub;
    const subClient = redisSub.duplicate();

    io.adapter(createAdapter(pubClient, subClient, {
      requestsTimeout: 5000,
    }));

    console.log('🔌 Socket.IO Redis adapter configured');
  }

  // Conexión de clientes
  io.on('connection', (socket) => {
    console.log(`👤 Client connected: ${socket.id}`);

    // Unirse a sala de usuario
    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`👤 User ${userId} joined room`);
    });

    // Unirse a sala de quiz
    socket.on('join:quiz', (quizId) => {
      socket.join(`quiz:${quizId}`);
      console.log(`🎮 User joined quiz ${quizId}`);
    });

    // Unirse a sala de quiz run
    socket.on('join:quiz-run', (quizRunId) => {
      socket.join(`quiz-run:${quizRunId}`);
      console.log(`🎮 User joined quiz run ${quizRunId}`);
    });

    // Mensaje de quiz
    socket.on('quiz:message', ({ quizRunId, message }) => {
      io.to(`quiz-run:${quizRunId}`).emit('quiz:message', message);
    });

    // Actualización de quiz
    socket.on('quiz:update', ({ quizId, update }) => {
      io.to(`quiz:${quizId}`).emit('quiz:update', update);
    });

    // Actualización de quiz run
    socket.on('quiz-run:update', ({ quizRunId, update }) => {
      io.to(`quiz-run:${quizRunId}`).emit('quiz-run:update', update);
    });

    // Notificación de usuario
    socket.on('user:notification', ({ userId, notification }) => {
      io.to(`user:${userId}`).emit('notification', notification);
    });

    // Sistema de ranking en tiempo real
    socket.on('ranking:update', ({ quizRunId, ranking }) => {
      io.to(`quiz-run:${quizRunId}`).emit('ranking:update', ranking);
    });

    // Desconexión
    socket.on('disconnect', (reason) => {
      console.log(`👤 Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Manejo de errores
    socket.on('error', (error) => {
      console.error(`🔌 Socket error: ${error}`);
    });
  });

  // Funciones helper para broadcasting
  const broadcast = {
    // Enviar a todos los usuarios en un quiz
    toQuiz: (quizId, event, data) => {
      io.to(`quiz:${quizId}`).emit(event, data);
    },

    // Enviar a todos los usuarios en un quiz run
    toQuizRun: (quizRunId, event, data) => {
      io.to(`quiz-run:${quizRunId}`).emit(event, data);
    },

    // Enviar a un usuario específico
    toUser: (userId, event, data) => {
      io.to(`user:${userId}`).emit(event, data);
    },

    // Enviar a todos
    toAll: (event, data) => {
      io.emit(event, data);
    },

    // Enviar a una sala específica
    toRoom: (room, event, data) => {
      io.to(room).emit(event, data);
    },
  };

  // Middleware de autenticación
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      // Verificar token (implementar según tu sistema de auth)
      const user = await verifyToken(token);
      
      if (!user) {
        return next(new Error('Authentication error'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  return { io, broadcast };
};

// Verificación de token (placeholder)
async function verifyToken(token) {
  // Implementar verificación real de JWT
  // Por ahora retorna true para testing
  return { id: 1, email: 'test@example.com' };
}

// Función para obtener instancia de Socket.IO
let ioInstance = null;

const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO not initialized');
  }
  return ioInstance;
};

const setIO = (io) => {
  ioInstance = io;
};

module.exports = {
  createSocketServer,
  getIO,
  setIO,
};
