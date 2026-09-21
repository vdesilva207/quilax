import prisma from "../lib/prisma.js";
import { validateQuiz } from "./quizValidationService.js";
import { generateQuizHash } from "./quizHashService.js";
import { getIO } from "../socket.js";
import { validateQuizRules, calculateQuizDuration } from "../utils/quizValidationService.js";

const MAX_TITLE = 100;
const MAX_DESC = 500;
const MAX_TIPS = 500;
/** Every N finished plays unlocks 1 create slot (ratio, not a one-time unlock). */
const PLAYS_PER_CREATE_SLOT = 10;

/** Only persist portable image URLs (https or data URI). Local/pasteboard paths break publish. */
function sanitizeImageUrl(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^data:image\//i.test(s)) return s;
  if (/^https:\/\//i.test(s)) return s;
  throw new Error(
    "Hay una imagen inválida (ruta local o del portapapeles). Elimínala y vuelve a añadirla desde la galería en JPG o PNG.",
  );
}

/*
====================================
VALIDAR SI USUARIO PUEDE CREAR QUIZZES
====================================
*/
const CREATE_GATE_BYPASS_EMAILS = (
  process.env.CREATE_GATE_BYPASS_EMAILS || "quilax@appquilax.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function validateUserCanCreateQuizzes(userId) {
  const uid = Number(userId);

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { email: true },
  });
  if (
    user?.email &&
    CREATE_GATE_BYPASS_EMAILS.includes(String(user.email).toLowerCase())
  ) {
    return true;
  }

  const [completedQuizzes, createdQuizzes] = await Promise.all([
    prisma.quizParticipant.count({
      where: {
        userId: uid,
        quizRun: { phase: "FINISHED" },
      },
    }),
    prisma.quiz.count({
      where: { creatorId: uid },
    }),
  ]);

  const allowedSlots = Math.floor(completedQuizzes / PLAYS_PER_CREATE_SLOT);
  if (createdQuizzes >= allowedSlots) {
    const needForNext =
      (createdQuizzes + 1) * PLAYS_PER_CREATE_SLOT - completedQuizzes;
    throw new Error(
      `Por cada ${PLAYS_PER_CREATE_SLOT} quizzes que juegas puedes crear 1. ` +
        `Has jugado ${completedQuizzes} y creado ${createdQuizzes}. ` +
        `Te faltan ${Math.max(needForNext, 0)} partidas para el siguiente cupo.`,
    );
  }

  return true;
}

/*
====================================
CREAR DRAFT
====================================
*/
export async function createDraft(userId, data) {
  if (!userId) throw new Error("Unauthorized");

  await validateUserCanCreateQuizzes(userId);

  const title = (data.title || "").trim().slice(0, MAX_TITLE) || "Borrador sin título";

  const baseData = {
    creatorId: Number(userId),
    title,
    status: "DRAFT",
    requestedDate: new Date(),
  };

  const metaData = {
    ...(data.category ? { category: String(data.category).trim().slice(0, 80) } : {}),
    ...(data.language ? { language: String(data.language).trim().slice(0, 10) } : {}),
    ...(data.coverImage ? { coverImage: sanitizeImageUrl(data.coverImage) } : {}),
    ...(data.description
      ? { description: String(data.description).trim().slice(0, MAX_DESC) }
      : {}),
    ...(data.tips ? { tips: String(data.tips).trim().slice(0, MAX_TIPS) } : {}),
  };

  let quiz;
  try {
    quiz = await prisma.quiz.create({ data: { ...baseData, ...metaData } });
  } catch (err) {
    const msg = String(err?.message || "");
    if (/Unknown argument|does not exist|Unknown field/i.test(msg)) {
      quiz = await prisma.quiz.create({ data: baseData });
    } else {
      throw err;
    }
  }

  try {
    const io = getIO();
    io.to(`user:${userId}`).emit("quiz:created", quiz);
  } catch {}

  return quiz;
}

export async function updateDraft(userId, quizId, data) {
  if (!userId) throw new Error("Unauthorized");

  const id = Number(quizId);
  const uid = Number(userId);

  const quiz = await prisma.quiz.findUnique({
    where: { id },
  });

  if (!quiz || quiz.creatorId !== uid) {
    throw new Error("Quiz no encontrado");
  }

  if (quiz.status !== "DRAFT") {
    throw new Error(
      "Solo puedes editar quizzes en estado DRAFT. Una vez enviado a revisión no se puede modificar.",
    );
  }

  return await prisma.$transaction(async (tx) => {
    const updateData = {};
    if (data.title !== undefined) {
      const t = String(data.title || "").trim().slice(0, MAX_TITLE);
      if (t) updateData.title = t;
    }
    if (data.difficulty !== undefined && data.difficulty !== null && data.difficulty !== "") {
      const d = Number(data.difficulty);
      if (Number.isFinite(d) && d >= 1 && d <= 10) {
        updateData.difficulty = Math.round(d);
      }
    }
    if (data.category !== undefined) {
      updateData.category = data.category
        ? String(data.category).trim().slice(0, 80)
        : null;
    }
    if (data.language !== undefined) {
      updateData.language = data.language
        ? String(data.language).trim().slice(0, 10)
        : null;
    }
    if (data.coverImage !== undefined) {
      updateData.coverImage = data.coverImage
        ? sanitizeImageUrl(data.coverImage)
        : null;
    }
    if (data.description !== undefined) {
      updateData.description = data.description
        ? String(data.description).trim().slice(0, MAX_DESC)
        : null;
    }
    if (data.tips !== undefined) {
      updateData.tips = data.tips
        ? String(data.tips).trim().slice(0, MAX_TIPS)
        : null;
    }

    let updatedQuiz;
    try {
      updatedQuiz = await tx.quiz.update({
        where: { id },
        data: updateData,
      });
    } catch (err) {
      const msg = String(err?.message || "");
      if (/Unknown argument|does not exist|Unknown field/i.test(msg)) {
        const safe = {};
        if (updateData.title) safe.title = updateData.title;
        if (updateData.difficulty != null) safe.difficulty = updateData.difficulty;
        updatedQuiz = await tx.quiz.update({ where: { id }, data: safe });
      } else {
        throw err;
      }
    }

    // Replace questions only when explicitly provided (title-only draft keeps existing).
    if (Array.isArray(data.questions)) {
      const questionsWithText = data.questions.filter(
        (q) => q && String(q.text || "").trim(),
      );

      // Full rules only when enough questions to publish; drafts may be partial.
      if (questionsWithText.length >= 5) {
        const tempQuiz = {
          title: updatedQuiz.title,
          questions: questionsWithText.map((q) => ({
            text: q.text,
            readTime: Math.floor((q.timeReadMs || 5000) / 1000),
            answerTime: Math.floor((q.timeAnswerMs || 10000) / 1000),
          })),
        };
        const validation = validateQuizRules(tempQuiz);
        if (!validation.isValid) {
          throw new Error(`Validación fallida: ${validation.errors.join(". ")}`);
        }
      }

      await tx.quizQuestion.deleteMany({ where: { quizId: id } });

      for (const q of questionsWithText) {
        if (!Array.isArray(q.answers) || q.answers.length < 2) {
          throw new Error("Cada pregunta necesita al menos 2 respuestas");
        }

        const answers = q.answers.map((a) => ({
          text: String(a.text || "").trim() || "—",
          isCorrect: Boolean(a.isCorrect),
        }));
        if (!answers.some((a) => a.isCorrect)) {
          answers[0].isCorrect = true;
        }

        try {
          await tx.quizQuestion.create({
            data: {
              quizId: id,
              text: String(q.text).trim(),
              imageUrl: sanitizeImageUrl(q.imageUrl),
              maxPoints: 1000,
              readTime: Math.floor((q.timeReadMs || 5000) / 1000),
              answerTime: Math.floor((q.timeAnswerMs || 10000) / 1000),
              answers: { create: answers },
            },
          });
        } catch (err) {
          const msg = String(err?.message || "");
          if (/Unknown argument|imageUrl|does not exist/i.test(msg)) {
            await tx.quizQuestion.create({
              data: {
                quizId: id,
                text: String(q.text).trim(),
                maxPoints: 1000,
                readTime: Math.floor((q.timeReadMs || 5000) / 1000),
                answerTime: Math.floor((q.timeAnswerMs || 10000) / 1000),
                answers: { create: answers },
              },
            });
          } else {
            throw err;
          }
        }
      }
    }

    if (data.adminPercent !== undefined || data.creatorPercent !== undefined) {
      await tx.rewardRule.deleteMany({
        where: {
          quizId: id,
          type: { in: ["ADMIN", "CREATOR"] },
        },
      });

      const rulesToCreate = [];
      if (data.adminPercent !== undefined) {
        rulesToCreate.push({
          quizId: id,
          type: "ADMIN",
          percent: Number(data.adminPercent),
        });
      }
      if (data.creatorPercent !== undefined) {
        rulesToCreate.push({
          quizId: id,
          type: "CREATOR",
          percent: Number(data.creatorPercent),
        });
      }
      if (rulesToCreate.length > 0) {
        await tx.rewardRule.createMany({ data: rulesToCreate });
      }
    }

    return tx.quiz.findUnique({
      where: { id },
      include: {
        questions: { include: { answers: true }, orderBy: { id: "asc" } },
      },
    });
  });
}

/*
====================================
GET MIS DRAFTS
====================================
*/
export async function getUserDrafts(userId) {
  return prisma.quiz.findMany({
    where: {
      creatorId: Number(userId),
      status: "DRAFT",
    },
    include: {
      questions: { include: { answers: true }, orderBy: { id: "asc" } },
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/*
====================================
DELETE DRAFT
====================================
*/
export async function deleteDraft(userId, quizId) {
  const id = Number(quizId);
  const uid = Number(userId);

  if (!id || !uid) throw new Error("Datos inválidos");

  const quiz = await prisma.quiz.findUnique({
    where: { id },
  });

  if (!quiz) throw new Error("Quiz no encontrado");
  if (quiz.creatorId !== uid) throw new Error("No autorizado");

  if (quiz.status !== "DRAFT") {
    throw new Error("Solo puedes borrar quizzes en estado DRAFT");
  }

  await prisma.quizAnswer.deleteMany({
    where: {
      question: {
        quizId: id,
      },
    },
  });

  await prisma.quizQuestion.deleteMany({ where: { quizId: id } });

  await prisma.quiz.delete({
    where: { id },
  });

  return { success: true };
}

/*
====================================
GENERAR HASH PREVIO
====================================
*/
export async function generatePreviewHash(quizData) {
  return generateQuizHash(quizData);
}
