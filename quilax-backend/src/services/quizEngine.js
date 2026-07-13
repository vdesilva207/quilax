import prisma from "../lib/prisma.js";
import redis from "../lib/redis.js";
import { answerQueue } from "../queues/answerQueue.js";

import { logQuizRun } from "../utils/logQuizRun.js";
import { getIO } from "../socket.js";
import { distributeQuizCredits } from "../utils/distributeCredits.js";

import {
  runAntiCheatChecks,
  calculateSecureScore,
  detectFastResponse,
} from "./antiCheatService.js";

// ⏱️ tiempos
const START_TIME = 3;
const FIXED_CORRECTION_TIME = 2;
const FIXED_RANKING_TIME = 6;

/**
 * 🚀 START RUN
 */
export async function startQuizRun(quizId, userId = null) {
  const now = new Date();

  const run = await prisma.quizRun.create({
    data: {
      quizId,
      currentIndex: 0,
      phase: "PRE_START",
      startedAt: now,
      phaseEndsAt: new Date(now.getTime() + START_TIME * 1000),
    },
    include: {
      quiz: { include: { questions: true } },
    },
  });

  // cache preguntas (NO DB lookups en runtime)
  await redis.set(
    `quizRun:${run.id}:questions`,
    JSON.stringify(run.quiz.questions)
  );

  await redis.set(`quizRun:${run.id}:phase`, run.phase);

  const enrollments = await prisma.quizEnrollment.findMany({
    where: { quizId },
    select: { userId: true },
  });

  const userIds = enrollments.map(e => e.userId);

  if (userIds.length > 0) {
    await prisma.quizParticipant.createMany({
      data: userIds.map(uid => ({
        quizRunId: run.id,
        userId: uid,
        status: "ACTIVE",
      })),
      skipDuplicates: true,
    });

    await prisma.quizScore.createMany({
      data: userIds.map(uid => ({
        quizRunId: run.id,
        userId: uid,
        score: 0,
      })),
      skipDuplicates: true,
    });

    await redis.sadd(
      `quizRun:${run.id}:participants`,
      ...userIds.map(id => id.toString())
    );
  }

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

  // Si Redis falla, obtener el run desde DB
  if (!questions.length) {
    run = await prisma.quizRun.findUnique({
      where: { id: quizRunId },
      include: { quiz: { include: { questions: true } } },
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

  const correct = question.answers.find(a => a.isCorrect);
  const correctAnswer = correct?.answer ?? null;

  const isCorrect =
    correctAnswer &&
    String(answer).trim().toLowerCase() ===
    String(correctAnswer).trim().toLowerCase();

  const score = calculateSecureScore({
    responseTimeMs,
    isCorrect,
  });

  // ⚡ Redis realtime score (ranking live)
  await redis.zincrby(
    `quizRun:${quizRunId}:scores`,
    score,
    userId.toString()
  );

  // ⚡ queue async write (NO DB blocking)
  await answerQueue.add("answer", {
    quizRunId,
    questionId,
    userId,
    answer,
    isCorrect,
    score,
    responseTimeMs,
  });

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
  const finished = await prisma.quizRun.update({
    where: { id: run.id },
    data: {
      phase: "FINISHED",
      finishedAt: new Date(),
    },
  });

  emitState(finished);

  await distributeQuizCredits(finished.id);

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