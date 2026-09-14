/**
 * Keep Postgres quiz scores aligned with Redis live ranking.
 * Redis ZSET `quizRun:{id}:scores` is the source of truth during play;
 * the answer worker writes DB asynchronously and can lag at finish.
 */
import prisma from '../lib/prisma.js';
import redis from '../lib/redis.js';

function pendingKey(quizRunId) {
  return `quizRun:${quizRunId}:answersPending`;
}

export async function markAnswerQueued(quizRunId) {
  try {
    await redis.incr(pendingKey(quizRunId));
  } catch (err) {
    console.warn('markAnswerQueued:', err?.message || err);
  }
}

export async function markAnswerProcessed(quizRunId) {
  try {
    const n = await redis.decr(pendingKey(quizRunId));
    if (n < 0) await redis.set(pendingKey(quizRunId), '0');
  } catch (err) {
    console.warn('markAnswerProcessed:', err?.message || err);
  }
}

/**
 * Wait until pending answer jobs for this run are drained (or timeout).
 */
export async function waitForAnswerQueueDrain(quizRunId, { timeoutMs = 15000, pollMs = 150 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    let pending = 0;
    try {
      pending = Number((await redis.get(pendingKey(quizRunId))) || 0);
    } catch {
      pending = 0;
    }
    if (pending <= 0) {
      return { drained: true, waitedMs: Date.now() - start, pending: 0 };
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  let pending = 0;
  try {
    pending = Number((await redis.get(pendingKey(quizRunId))) || 0);
  } catch {
    /* ignore */
  }
  return { drained: false, waitedMs: timeoutMs, pending };
}

/**
 * Read Redis ZSET and force QuizScore + QuizParticipant to those absolute values.
 * Safe after drain; also safe with an idempotent worker that sets absolute Redis scores.
 */
export async function flushQuizRunScoresFromRedis(quizRunId) {
  const key = `quizRun:${quizRunId}:scores`;
  let rows;
  try {
    rows = await redis.zrevrange(key, 0, -1, 'WITHSCORES');
  } catch (err) {
    console.error('flushQuizRunScoresFromRedis redis read:', err?.message || err);
    return { synced: 0, error: err?.message || String(err) };
  }

  if (!rows?.length) {
    return { synced: 0 };
  }

  const updates = [];
  for (let i = 0; i < rows.length; i += 2) {
    const userId = Number(rows[i]);
    const score = Math.round(Number(rows[i + 1]) || 0);
    if (!Number.isFinite(userId) || userId <= 0) continue;
    updates.push({ userId, score });
  }

  if (updates.length === 0) return { synced: 0 };

  // Chunk to avoid huge transactions under large lobbies
  const CHUNK = 200;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK);
    await prisma.$transaction(
      chunk.map(({ userId, score }) =>
        prisma.quizScore.upsert({
          where: { quizRunId_userId: { quizRunId, userId } },
          update: { score, lastAnswerAt: new Date() },
          create: { quizRunId, userId, score, lastAnswerAt: new Date() },
        })
      )
    );
    await prisma.$transaction(
      chunk.map(({ userId, score }) =>
        prisma.quizParticipant.updateMany({
          where: { quizRunId, userId },
          data: { score },
        })
      )
    );
  }

  return { synced: updates.length };
}

/**
 * Apply absolute Redis score for one user (idempotent worker path).
 */
export async function applyAbsoluteRedisScore(quizRunId, userId) {
  const raw = await redis.zscore(`quizRun:${quizRunId}:scores`, String(userId));
  if (raw == null) return null;
  const score = Math.round(Number(raw) || 0);
  const now = new Date();
  await prisma.quizScore.upsert({
    where: { quizRunId_userId: { quizRunId, userId } },
    update: { score, lastAnswerAt: now },
    create: { quizRunId, userId, score, lastAnswerAt: now },
  });
  await prisma.quizParticipant.updateMany({
    where: { quizRunId, userId },
    data: { score },
  });
  return score;
}
