import prisma from "../lib/prisma.js";
import redis from "../lib/redis.js";
import { answerQueue } from "../queues/answerQueue.js";

import { logQuizRun } from "../utils/logQuizRun.js";
import { getIO } from "../socket.js";
import { distributeQuizCredits } from "../utils/distributeCredits.js";
import { addSeasonPoints } from "./season.service.js";
import {
  markAnswerQueued,
  markAnswerProcessed,
  waitForAnswerQueueDrain,
  flushQuizRunScoresFromRedis,
} from "./quizScoreSync.js";

import {
  runAntiCheatChecks,
  calculateSecureScore,
  detectFastResponse,
} from "./antiCheatService.js";

// ⏱️ tiempos
/** Countdown lobby opens this many seconds before scheduledAt for everyone. */
export const LOBBY_OPEN_BEFORE_SECONDS = 60;
/** Fallback lobby length when there is no schedule (dev / immediate start). */
export const LOBBY_SECONDS = 60;
const FIXED_CORRECTION_TIME = 2;
const FIXED_RANKING_TIME = 6;

const questionsWithAnswersInclude = {
  questions: { include: { answers: true } },
};

/** Attach imageUrl even if Prisma client is stale (column may exist only in DB). */
async function withQuestionImages(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return questions || [];
  try {
    const ids = questions.map((q) => Number(q.id)).filter(Number.isFinite);
    if (!ids.length) return questions;
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, "imageUrl" FROM "QuizQuestion" WHERE id = ANY($1::int[])`,
      ids
    );
    const byId = new Map((rows || []).map((r) => [Number(r.id), r.imageUrl || null]));
    return questions.map((q) => ({
      ...q,
      imageUrl: byId.get(Number(q.id)) ?? q.imageUrl ?? null,
    }));
  } catch (err) {
    console.warn("withQuestionImages:", err?.message || err);
    return questions;
  }
}

async function cacheRunQuestions(runId, questions, phase) {
  const enriched = await withQuestionImages(questions);
  await redis.set(`quizRun:${runId}:questions`, JSON.stringify(enriched || []));
  if (phase) {
    await redis.set(`quizRun:${runId}:phase`, phase);
  }
}

async function nextScheduleForQuiz(quizId) {
  const now = new Date();
  const upcoming = await prisma.quizSchedule.findFirst({
    where: {
      quizId,
      scheduledAt: { gte: new Date(now.getTime() - 30_000) },
    },
    orderBy: { scheduledAt: "asc" },
  });
  return upcoming;
}

/**
 * True when lobby may open: within LOBBY_OPEN_BEFORE_SECONDS of schedule, or no schedule in DEV.
 */
export async function isLobbyWindowOpen(quizId) {
  const schedule = await nextScheduleForQuiz(quizId);
  if (!schedule) {
    return process.env.DEV_LIGHT_WORKERS === "true" || process.env.NODE_ENV !== "production";
  }
  const now = Date.now();
  const startMs = new Date(schedule.scheduledAt).getTime();
  const openAt = startMs - LOBBY_OPEN_BEFORE_SECONDS * 1000;
  return now >= openAt;
}

/**
 * Find active run. Only creates a lobby when the schedule window is open (T−1min).
 */
export async function ensureActiveQuizRun(quizId, userId = null, { force = false } = {}) {
  let run = await prisma.quizRun.findFirst({
    where: {
      quizId,
      phase: { not: "FINISHED" },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!run) {
    if (!force && !(await isLobbyWindowOpen(quizId))) {
      const err = new Error("LOBBY_NOT_OPEN");
      err.code = "LOBBY_NOT_OPEN";
      throw err;
    }
    const schedule = await nextScheduleForQuiz(quizId);
    const phaseEndsAt = schedule?.scheduledAt
      ? new Date(Math.max(new Date(schedule.scheduledAt).getTime(), Date.now() + 5_000))
      : null;
    return startQuizRun(quizId, userId, { phaseEndsAt });
  }

  let questionsRaw = null;
  try {
    questionsRaw = await redis.get(`quizRun:${run.id}:questions`);
  } catch {
    questionsRaw = null;
  }

  const needsClock = run.phase === "PRE_START" && !run.phaseEndsAt;
  const needsCache = !questionsRaw;

  if (needsClock || needsCache) {
    const full = await prisma.quizRun.findUnique({
      where: { id: run.id },
      include: { quiz: { include: questionsWithAnswersInclude } },
    });

    if (needsClock) {
      const now = new Date();
      const schedule = await nextScheduleForQuiz(quizId);
      const ends = schedule?.scheduledAt
        ? new Date(Math.max(new Date(schedule.scheduledAt).getTime(), now.getTime() + 5_000))
        : new Date(now.getTime() + LOBBY_SECONDS * 1000);
      run = await prisma.quizRun.update({
        where: { id: run.id },
        data: {
          startedAt: run.startedAt || now,
          phaseEndsAt: ends,
        },
      });
    }

    await cacheRunQuestions(
      run.id,
      full?.quiz?.questions || [],
      run.phase
    );
    emitState(run);
  }

  return run;
}

/**
 * Open PRE_START for published quizzes whose schedule is within the next minute.
 */
export async function openLobbiesForDueQuizzes() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + LOBBY_OPEN_BEFORE_SECONDS * 1000);
  const windowStart = new Date(now.getTime() - 15_000);

  const dueSchedules = await prisma.quizSchedule.findMany({
    where: {
      scheduledAt: { gte: windowStart, lte: windowEnd },
      quiz: { status: "PUBLISHED" },
    },
    include: {
      quiz: {
        select: {
          id: true,
          quizRuns: {
            where: { phase: { not: "FINISHED" } },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  for (const schedule of dueSchedules) {
    if (schedule.quiz?.quizRuns?.length) continue;
    try {
      await startQuizRun(schedule.quizId, null, {
        phaseEndsAt: new Date(schedule.scheduledAt),
      });
    } catch (err) {
      console.error("openLobby failed for quiz", schedule.quizId, err?.message || err);
    }
  }
}

/**
 * 🚀 START RUN
 */
export async function startQuizRun(quizId, userId = null, { phaseEndsAt = null } = {}) {
  const now = new Date();
  const ends =
    phaseEndsAt instanceof Date && !Number.isNaN(phaseEndsAt.getTime())
      ? phaseEndsAt
      : new Date(now.getTime() + LOBBY_SECONDS * 1000);

  const run = await prisma.quizRun.create({
    data: {
      quizId,
      currentIndex: 0,
      phase: "PRE_START",
      startedAt: now,
      phaseEndsAt: ends.getTime() <= now.getTime()
        ? new Date(now.getTime() + 5_000)
        : ends,
    },
    include: {
      quiz: { include: questionsWithAnswersInclude },
    },
  });

  // cache preguntas + opciones (NO DB lookups en runtime)
  await cacheRunQuestions(run.id, run.quiz.questions, run.phase);

  // Participants are created on join (early-join bonus + prize pool).
  // Do not seed from enrollments here or join will see alreadyJoined.

  logQuizRun({
    quizRunId: run.id,
    userId,
    event: "QUIZRUN_CREATED",
    stateAfter: run.phase,
  });

  emitState(run);
  return run;
}

/**
 * ➡️ ADVANCE PHASE
 */
export async function advanceQuizPhase(quizRunId) {
  const run = await prisma.quizRun.findUnique({
    where: { id: quizRunId },
    include: { quiz: { include: { questions: true } } },
  });

  if (!run || run.phase === "FINISHED") return run;

  const now = new Date();
  if (run.phaseEndsAt && now < run.phaseEndsAt) return run;

  const questions = run.quiz.questions;
  const prevPhase = run.phase;

  let nextPhase = run.phase;
  let nextIndex = run.currentIndex;
  let duration = 0;

  const q = questions[run.currentIndex];

  switch (run.phase) {
    case "PRE_START":
      nextPhase = "QUESTION_READ";
      duration = q.readTime;
      break;

    case "QUESTION_READ":
      nextPhase = "QUESTION_ANSWER";
      duration = q.answerTime;
      break;

    case "QUESTION_ANSWER":
      nextPhase = "QUESTION_CORRECTION";
      duration = FIXED_CORRECTION_TIME;
      break;

    case "QUESTION_CORRECTION":
      nextPhase = "QUESTION_RANKING";
      duration = FIXED_RANKING_TIME;
      break;

    case "QUESTION_RANKING":
      if (run.currentIndex + 1 < questions.length) {
        nextIndex++;
        nextPhase = "QUESTION_READ";
        duration = questions[nextIndex].readTime;
      } else {
        return finishRun(run, prevPhase);
      }
      break;
  }

  const updated = await prisma.quizRun.update({
    where: { id: quizRunId },
    data: {
      phase: nextPhase,
      currentIndex: nextIndex,
      phaseEndsAt: new Date(now.getTime() + duration * 1000),
    },
  });

  await redis.set(`quizRun:${updated.id}:phase`, updated.phase);

  emitState(updated);
  return updated;
}

/**
 * ✍️ SUBMIT ANSWER (OPTIMIZADO 500K)
 */
export async function submitAnswer({
  quizRunId,
  questionId,
  userId,
  answer,
  responseTimeMs,
  ipAddress,
}) {
  // 🔥 preguntas desde Redis (cache)
  let questions = [];
  let run = null;

  try {
    const questionsRaw = await redis.get(`quizRun:${quizRunId}:questions`);
    if (questionsRaw) {
      questions = JSON.parse(questionsRaw);
    }
  } catch (err) {
    console.error("Redis questions error", err);
  }

  // Si Redis falla, obtener el run desde DB (con answers)
  if (!questions.length) {
    run = await prisma.quizRun.findUnique({
      where: { id: quizRunId },
      include: { quiz: { include: questionsWithAnswersInclude } },
    });

    if (!run) {
      return { allowed: false, reason: "RUN_NOT_READY" };
    }

    questions = run.quiz?.questions || [];
  }

  // ⚡ fase ultra rápida desde Redis
  let phase = await redis.get(`quizRun:${quizRunId}:phase`);
  if (!phase && run) phase = run.phase;

  if (phase !== "QUESTION_ANSWER") {
    return { allowed: false, reason: "LATE_OR_INVALID_PHASE" };
  }

  detectFastResponse({ responseTimeMs, userId, quizRunId });

  // ⚡ check participante ultra rápido (Redis primero)
  const isParticipant = await redis.sismember(
    `quizRun:${quizRunId}:participants`,
    userId.toString()
  );

  if (!isParticipant) {
    return { allowed: false, reason: "NOT_PARTICIPANT" };
  }

  // Obtener el run si no lo tenemos aún (para anti-cheat)
  if (!run) {
    run = await prisma.quizRun.findUnique({
      where: { id: quizRunId },
      include: { quiz: { include: { questions: true } } },
    });

    if (!run) {
      return { allowed: false, reason: "RUN_NOT_READY" };
    }
  }

  const antiCheat = await runAntiCheatChecks({
    run,
    userId,
    ip: ipAddress || null,
  });

  if (!antiCheat.allowed) return antiCheat;

  const question = questions[run.currentIndex];

  if (!question || question.id !== questionId) {
    return { allowed: false, reason: "INVALID_QUESTION" };
  }

  const correct = (question.answers || []).find(a => a.isCorrect);
  const correctAnswer = correct?.text ?? null;

  const isCorrect =
    correctAnswer &&
    String(answer).trim().toLowerCase() ===
    String(correctAnswer).trim().toLowerCase();

  const score = calculateSecureScore({
    responseTimeMs,
    isCorrect,
    maxPoints: question.maxPoints,
    answerTimeSec: question.answerTime,
  });

  // ⚡ Redis realtime score (ranking live)
  await redis.zincrby(
    `quizRun:${quizRunId}:scores`,
    score,
    userId.toString()
  );

  // ⚡ queue async write (NO DB blocking)
  await markAnswerQueued(quizRunId);
  try {
    await answerQueue.add("answer", {
      quizRunId,
      questionId,
      userId,
      answer,
      isCorrect,
      score,
      responseTimeMs,
    });
  } catch (err) {
    await markAnswerProcessed(quizRunId);
    throw err;
  }

  return {
    allowed: true,
    isCorrect,
    score,
  };
}

/**
 * 🏁 FIN RUN
 */
async function finishRun(run, prevPhase) {
  // Drain async answer writes, then force DB scores = Redis live ranking
  // so prizes/season never use a stale Postgres ranking.
  try {
    const drain = await waitForAnswerQueueDrain(run.id, { timeoutMs: 15000 });
    if (!drain.drained) {
      console.warn(
        `finishRun ${run.id}: answer queue still pending=${drain.pending} after ${drain.waitedMs}ms — syncing Redis anyway`
      );
    }
    const flushed = await flushQuizRunScoresFromRedis(run.id);
    console.log(
      `finishRun ${run.id}: scores synced from Redis (${flushed.synced} players, drained=${drain.drained})`
    );
  } catch (err) {
    console.error("finishRun score sync failed:", err?.message || err);
  }

  const finished = await prisma.quizRun.update({
    where: { id: run.id },
    data: {
      phase: "FINISHED",
      finishedAt: new Date(),
    },
  });

  emitState(finished);

  try {
    await distributeQuizCredits(finished.id);
  } catch (err) {
    console.error("distributeQuizCredits after finish failed:", err?.message || err);
  }

  // Season ranking: sum of quiz scores across the active season
  try {
    const scores = await prisma.quizScore.findMany({
      where: { quizRunId: finished.id },
      select: { userId: true, score: true },
    });
    for (const row of scores) {
      const pts = Number(row.score) || 0;
      if (pts > 0) {
        await addSeasonPoints(row.userId, pts);
      }
    }
  } catch (err) {
    console.error("addSeasonPoints after finish failed:", err?.message || err);
  }

  return finished;
}

/**
 * 📡 SOCKET
 */
function emitState(run) {
  const io = getIO();
  io.to(`quiz-${run.id}`).emit("quiz:state", {
    quizRunId: run.id,
    phase: run.phase,
    currentIndex: run.currentIndex,
    phaseEndsAt: run.phaseEndsAt,
  });
}

/**
 * 🔁 LOOP GLOBAL
 */
export async function advanceExpiredQuizRuns() {
  const now = new Date();

  try {
    await openLobbiesForDueQuizzes();
  } catch (err) {
    console.error("openLobbiesForDueQuizzes:", err?.message || err);
  }

  const runs = await prisma.quizRun.findMany({
    where: {
      phase: { not: "FINISHED" },
      phaseEndsAt: { lte: now },
    },
    select: { id: true },
  });

  for (const r of runs) {
    await advanceQuizPhase(r.id);
  }
}