import prisma from "../lib/prisma.js";
import { validateQuiz } from "./quizValidationService.js";
import { generateQuizHash } from "./quizHashService.js";
import { getIO } from "../socket.js";
import { validateQuizRules, calculateQuizDuration } from "../utils/quizValidationService.js";

const MAX_TITLE = 100;
const MAX_DESC = 500;
const MIN_QUIZZES_TO_CREATE = 10; // Configurable: mínimo de quizzes jugados para poder crear
const EARLY_ADOPTER_LIMIT = 1000; // Primeras 1000 personas
const EARLY_ADOPTER_FREE_QUIZZES = 5; // Pueden crear 5 quizzes sin restricción

/*
====================================
VALIDAR SI USUARIO PUEDE CREAR QUIZZES
====================================
*/
async function validateUserCanCreateQuizzes(userId) {
  const uid = Number(userId);
  
  // Verificar si es early adopter (entre los primeros 1000 usuarios por ID)
  const isEarlyAdopter = uid <= EARLY_ADOPTER_LIMIT;
  
  // Si es early adopter, verificar cuántos quizzes ha creado
  if (isEarlyAdopter) {
    const createdQuizzes = await prisma.quiz.count({
      where: {
        creatorId: uid
      }
    });
    
    // Puede crear hasta 5 quizzes sin restricción
    if (createdQuizzes < EARLY_ADOPTER_FREE_QUIZZES) {
      return true; // Early adopter con quizzes gratuitos disponibles
    }
    
    // Después de 5 quizzes, debe cumplir la norma normal
    // Continuamos con la validación normal abajo
  }
  
  // Validación normal para todos (incluidos early adopters después de su límite)
  const completedQuizzes = await prisma.quizParticipant.count({
    where: {
      userId: uid,
      quizRun: {
        phase: "FINISHED"
      }
    }
  });

  if (completedQuizzes < MIN_QUIZZES_TO_CREATE) {
    const extraMessage = isEarlyAdopter 
      ? ` Como early adopter, ya usaste tus ${EARLY_ADOPTER_FREE_QUIZZES} quizzes gratuitos.`
      : '';
    
    throw new Error(`Debes jugar al menos ${MIN_QUIZZES_TO_CREATE} quizzes antes de poder crear los tuyos. Has completado ${completedQuizzes}.${extraMessage}`);
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

  // Validar que el usuario ha jugado suficientes quizzes
  await validateUserCanCreateQuizzes(userId);

  const title = (data.title || "").trim().slice(0, MAX_TITLE);

  const quiz = await prisma.quiz.create({
    data: {
      creatorId: Number(userId),
      title,
      status: "DRAFT",
      requestedDate: new Date(),
    },
  });

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
    throw new Error("Solo puedes editar quizzes en estado DRAFT. Una vez enviado a revisión no se puede modificar.");
  }

  return await prisma.$transaction(async (tx) => {
    // 🧠 1. UPDATE SIMPLE (sin preguntas)
    const updatedQuiz = await tx.quiz.update({
  where: { id },
  data: {
    ...(data.title && {
      title: data.title.trim().slice(0, 100),
    }),
    // ❌ NADA de adminPercent ni creatorPercent aquí
  },
});

    // 🧠 2. SI VIENEN PREGUNTAS → REEMPLAZAR
    if (data.questions && Array.isArray(data.questions)) {
      // 🎯 VALIDAR REGLAS DE TIEMPO Y PREGUNTAS ANTES DE GUARDAR
      const tempQuiz = {
        title: updatedQuiz.title,
        questions: data.questions.map(q => ({
          text: q.text,
          readTime: Math.floor((q.timeReadMs || 5000) / 1000),
          answerTime: Math.floor((q.timeAnswerMs || 10000) / 1000),
          pointsPerDecisecond: q.pointsPerDecisecond || null
        }))
      };
      
      const validation = validateQuizRules(tempQuiz);
      if (!validation.isValid) {
        throw new Error(`Validación fallida: ${validation.errors.join('. ')}`);
      }
      
      // borrar anteriores
      await tx.quizQuestion.deleteMany({ where: { quizId: id } });

      for (const q of data.questions) {
        if (!q.text || !Array.isArray(q.answers)) {
          throw new Error("Formato de preguntas inválido");
        }

        const createdQuestion = await tx.quizQuestion.create({
          data: {
            quizId: id,
            text: q.text.trim(),
            maxPoints: 1000,
            readTime: Math.floor((q.timeReadMs || 5000) / 1000),
            answerTime: Math.floor((q.timeAnswerMs || 10000) / 1000),
            pointsPerDecisecond: q.pointsPerDecisecond || null,

            answers: {
              create: q.answers.map((a) => ({
                text: a.text.trim(),
                isCorrect: a.isCorrect,
              })),
            },
          },
        });
      }
      
      // 🎯 ACTUALIZAR DURACIÓN ESTIMADA EN EL QUIZ
      const estimatedDuration = calculateQuizDuration(tempQuiz.questions);
      await tx.quiz.update({
        where: { id },
        data: { estimatedDuration }
      });
    }

    // 🧠 ACTUALIZAR REWARD RULES (economía)
if (
  data.adminPercent !== undefined ||
  data.creatorPercent !== undefined
) {
  // borrar reglas no POSITION (economía fija)
  await tx.rewardRule.deleteMany({
    where: {
      quizId: id,
      type: {
        in: ["ADMIN", "CREATOR"],
      },
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
    await tx.rewardRule.createMany({
      data: rulesToCreate,
    });
  }
}

    return updatedQuiz;
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
    include: { questions: true },
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

  // 🔥 cascada manual
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
export function prepareQuizForPublish(quiz) {
  return generateQuizHash(quiz);
}