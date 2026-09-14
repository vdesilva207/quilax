import prisma from "../lib/prisma.js";
import redis from "../lib/redis.js";
import { getIO } from "../socket.js";

const ENTRY_COST = 1;

// Cache para participantes activos por quiz run
const PARTICIPANTS_CACHE_TTL = 300; // 5 minutes

// Optimización: Redis cache para evitar DB queries frecuentes
async function getCachedParticipantsCount(quizRunId) {
  const cacheKey = `quizRun:${quizRunId}:participants:count`;
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return parseInt(cached);
    }
    
    // Si no está en cache, contar y guardar
    const count = await prisma.quizParticipant.count({
      where: { quizRunId }
    });
    
    await redis.setex(cacheKey, PARTICIPANTS_CACHE_TTL, count.toString());
    return count;
  } catch (error) {
    console.error('Error getting cached participants count:', error);
    // Fallback a DB directo
    return prisma.quizParticipant.count({
      where: { quizRunId }
    });
  }
}

// Optimización: Batch update para múltiples participantes
async function batchUpdateParticipants(updates) {
  return prisma.$transaction(
    updates.map(update => 
      prisma.quizParticipant.upsert(update)
    )
  );
}

// Optimización: Redis pub/sub para notificaciones en tiempo real
async function broadcastQuizUpdate(quizRunId, event, data) {
  try {
    const io = getIO();
    
    // Usar Redis pub/sub para multi-instancia broadcasting
    await redis.publish(`quiz:${quizRunId}`, JSON.stringify({
      event,
      data,
      timestamp: Date.now()
    }));
    
    // Local broadcast
    io.to(`quiz-${quizRunId}`).emit(event, data);
  } catch (error) {
    console.error('Error broadcasting quiz update:', error);
  }
}

// Servicio optimizado para unirse a quiz
export async function optimizedJoinQuiz(quizRunId, userId) {
  const startTime = Date.now();
  
  try {
    // 1. Validaciones en paralelo
    const [run, user] = await Promise.all([
      prisma.quizRun.findUnique({
        where: { id: quizRunId },
        include: { quiz: true }
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, balance: true }
      })
    ]);

    if (!run) throw new Error("Quiz no encontrado");
    if (run.phase !== "PRE_START") throw new Error("El quiz ya ha comenzado");
    if (!user) throw new Error("Usuario no encontrado");
    if (user.balance < ENTRY_COST) throw new Error("Saldo insuficiente");

    // 2. Verificar si ya es participante (usando cache)
    const existingKey = `quizRun:${quizRunId}:participant:${userId}`;
    const existingParticipant = await redis.get(existingKey);
    
    if (existingParticipant) {
      const participant = JSON.parse(existingParticipant);
      return {
        alreadyJoined: true,
        joinPosition: null,
        earlyJoinBonus: participant.score || 0,
        totalPrizeCredits: run.totalPrizeCredits,
        processingTime: Date.now() - startTime
      };
    }

    // 3. Obtener posición y bonus (optimizado con cache)
    const participantsCount = await getCachedParticipantsCount(quizRunId);
    const joinPosition = participantsCount + 1;
    const earlyJoinBonus = getEarlyJoinBonus(joinPosition);

    // 4. Transacción optimizada
    const result = await prisma.$transaction(async (tx) => {
      // Crear participante
      const participant = await tx.quizParticipant.create({
        data: {
          quizRunId,
          userId,
          status: "ACTIVE",
          score: earlyJoinBonus,
        }
      });

      // Crear/actualizar score
      await tx.quizScore.upsert({
        where: {
          quizRunId_userId: {
            quizRunId,
            userId,
          },
        },
        update: {
          score: earlyJoinBonus,
        },
        create: {
          quizRunId,
          userId,
          score: earlyJoinBonus,
        },
      });

      // Descontar crédito del usuario
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: ENTRY_COST },
        },
      });

      // Actualizar prize pool del quiz run
      await tx.quizRun.update({
        where: { id: quizRunId },
        data: {
          totalPrizeCredits: { increment: ENTRY_COST },
        },
      });

      // Registrar transacción
      await tx.transaction.create({
        data: {
          userId,
          quizId: run.quizId,
          type: "QUIZ_ENTRY",
          amount: ENTRY_COST,
          currency: "CREDITS",
        },
      });

      return participant;
    });

    // 5. Actualizar cache
    await Promise.all([
      redis.setex(existingKey, PARTICIPANTS_CACHE_TTL, JSON.stringify({
        userId,
        score: earlyJoinBonus,
        joinedAt: new Date().toISOString()
      })),
      redis.incr(`quizRun:${quizRunId}:participants:count`),
      redis.expire(`quizRun:${quizRunId}:participants:count`, PARTICIPANTS_CACHE_TTL)
    ]);

    // 6. Broadcast optimizado
    await broadcastQuizUpdate(quizRunId, "participant:joined", {
      userId,
      joinPosition,
      earlyJoinBonus,
      totalParticipants: participantsCount + 1,
      totalPrizeCredits: run.totalPrizeCredits + ENTRY_COST
    });

    return {
      alreadyJoined: false,
      joinPosition,
      earlyJoinBonus,
      totalPrizeCredits: run.totalPrizeCredits + ENTRY_COST,
      processingTime: Date.now() - startTime
    };

  } catch (error) {
    console.error(`Error in optimizedJoinQuiz for user ${userId}:`, error);
    throw error;
  }
}

// Helper function para early join bonus
function getEarlyJoinBonus(joinPosition) {
  const EARLY_JOIN_BONUS_RANGES = [
    { from: 1, to: 1, bonus: 600 },
    { from: 2, to: 5, bonus: 520 },
    { from: 6, to: 10, bonus: 450 },
    { from: 11, to: 20, bonus: 360 },
    { from: 21, to: 30, bonus: 285 },
    { from: 31, to: 40, bonus: 225 },
    { from: 41, to: 50, bonus: 175 },
    { from: 51, to: 60, bonus: 140 },
    { from: 61, to: 70, bonus: 115 },
    { from: 71, to: 80, bonus: 95 },
    { from: 81, to: 89, bonus: 80 },
    { from: 90, to: 100, bonus: 70 },
    { from: 101, to: 150, bonus: 55 },
    { from: 151, to: 200, bonus: 45 },
    { from: 201, to: 300, bonus: 35 },
    { from: 301, to: 400, bonus: 25 },
    { from: 401, to: 500, bonus: 15 },
  ];

  const range = EARLY_JOIN_BONUS_RANGES.find(
    ({ from, to }) => joinPosition >= from && joinPosition <= to
  );

  return range ? range.bonus : 0;
}

// Limpieza de cache cuando termina un quiz
export async function clearQuizCache(quizRunId) {
  try {
    const patterns = [
      `quizRun:${quizRunId}:participants:count`,
      `quizRun:${quizRunId}:participant:*`,
      `quizRun:${quizRunId}:*`
    ];

    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch (error) {
    console.error('Error clearing quiz cache:', error);
  }
}
