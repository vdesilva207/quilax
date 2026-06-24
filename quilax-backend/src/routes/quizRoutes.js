import { Router } from "express";
import prisma from "../lib/prisma.js";

import {
  createDraft,
  updateDraft,
  getUserDrafts,
  deleteDraft,
} from "../services/quizCreationService.js";

import { publishQuiz } from "../services/quizPublishService.js";
import { calculateMaxCredits } from "../utils/quizCredits.js";

const router = Router();

/*
====================================
HELPER
====================================
*/
function getUserId(req) {
  // temporal: si luego usas auth middleware, reemplazar por req.user.id
  return Number(req.user?.id || req.headers["x-user-id"]);
}

/*
====================================
CREATE DRAFT
POST /quiz/draft
====================================
*/
/*
====================================
CREATE DRAFT
POST /quiz/draft
====================================
*/
router.post("/draft", async (req, res) => {
  try {
    const creatorId = Number(req.headers["x-user-id"]); // parse a número
    const { title } = req.body;

    if (!creatorId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const quiz = await prisma.quiz.create({
      data: {
        creatorId,
        title,
        status: "DRAFT",
        requestedDate: new Date(), // obligatorio según modelo
      },
    });

    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

/*
====================================
UPDATE DRAFT
PUT /quiz/:id
====================================
*/
router.put("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const quizId = Number(req.params.id);

    const quiz = await updateDraft(userId, quizId, req.body);
    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

/*
====================================
GET MY DRAFTS
GET /quiz/my-drafts
====================================
*/
router.get("/my-drafts", async (req, res) => {
  try {
    const userId = getUserId(req);
    const drafts = await getUserDrafts(userId);
    res.json(drafts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/*
====================================
DELETE DRAFT
DELETE /quiz/:id
====================================
*/
router.delete("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const quizId = Number(req.params.id);

    const result = await deleteDraft(userId, quizId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

/*
====================================
PUBLISH QUIZ
POST /quiz/:id/publish
====================================
*/
router.post("/:id/publish", async (req, res) => {
  try {
    const userId = getUserId(req);
    const quizId = Number(req.params.id);
    const { scheduledAt } = req.body;

    const quiz = await publishQuiz(userId, quizId, scheduledAt);
    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

/*
====================================
GET QUIZ BY ID
GET /quiz/:id
====================================
*/
router.get("/:id", async (req, res) => {
  try {
    const quizId = Number(req.params.id);

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
        rewardRules: true,
      },
    });

    if (!quiz) return res.status(404).json({ error: "Quiz no encontrado" });
    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/*
====================================
GET MAX CREDITS
GET /quiz/:id/max-credits
====================================
*/
router.get("/:id/max-credits", async (req, res) => {
  try {
    const quizId = Number(req.params.id);

    const participants = await prisma.quizParticipant.count({
   where: {
    quizRun: {
      quizId,
    },
    },
   });
    const settings = await prisma.systemSettings.findFirst();
    const creditPerJoin = settings?.creditPerJoin ?? 1;

    const totalPrizeCredits = participants * creditPerJoin;
    const rulesWithCredits = await calculateMaxCredits(quizId, totalPrizeCredits);

    const totalDistributed = rulesWithCredits.reduce((acc, r) => acc + (r.totalCredits || 0), 0);

    res.json({
      totalPrizeCredits,
      totalDistributed,
      rules: rulesWithCredits,
    });
  } catch (err) {
  console.error("❌ MAX CREDITS ERROR:", err);

  res.status(500).json({
    error: err.message,
    stack: err.stack,
  });
}
});

export default router;


/*
====================================
ADD TEST DATA (ONLY DEV)
POST /quiz/:id/add-test-data
====================================
*/
router.post("/:id/add-test-data", async (req, res) => {
  try {
    const quizId = Number(req.params.id);

    // 1. USERS
    let users = await prisma.user.findMany({ take: 10 });

    if (users.length < 10) {
      const toCreate = 10 - users.length;

      for (let i = 0; i < toCreate; i++) {
        const user = await prisma.user.create({
          data: {
            email: `test${Date.now()}_${i}@test.com`,
            password: "123456",
          },
        });
        users.push(user);
      }
    }

    // 2. RUN
    const run = await prisma.quizRun.create({
      data: {
        quizId,
        startedAt: new Date(),
        phase: "FINISHED",
      },
    });

    // 3. PARTICIPANTS
    await Promise.all(
      users.map((u) =>
        prisma.quizParticipant.create({
          data: {
            quizRunId: run.id,
            userId: u.id,
          },
        })
      )
    );

    const participants = users.length;
    const CREDIT_PER_JOIN = 1;
    const totalPrizeCredits = participants * CREDIT_PER_JOIN;

    // 4. REWARD RULES (FIX percent)
    await prisma.rewardRule.deleteMany({ where: { quizId } });

    await prisma.rewardRule.createMany({
      data: [
        {
          quizId,
          type: "POSITION",
          positionFrom: 1,
          positionTo: 1,
          percent: 50,
        },
        {
          quizId,
          type: "POSITION",
          positionFrom: 2,
          positionTo: 3,
          percent: 30,
        },
        {
          quizId,
          type: "POSITION",
          positionFrom: 4,
          positionTo: 10,
          percent: 20,
        },
      ],
    });

    res.json({
      ok: true,
      participants,
      totalPrizeCredits,
      runId: run.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
/*
====================================
TEST RUN SIMPLE
POST /quiz/:id/test-run
====================================
*/
router.post("/:id/test-run", async (req, res) => {
  try {
    const quizId = Number(req.params.id);

    // coger usuarios existentes
    const users = await prisma.user.findMany({ take: 10 });

    if (users.length === 0) {
      return res.status(400).json({
        error: "No hay usuarios en la base de datos",
      });
    }

    const run = await prisma.quizRun.create({
      data: {
        quizId,
        startedAt: new Date(),
        phase: "FINISHED",
      },
    });

    await Promise.all(
      users.map((u) =>
        prisma.quizParticipant.create({
          data: {
            quizRunId: run.id,
            userId: u.id,
          },
        })
      )
    );

    res.json({
      message: "Test run creado correctamente",
      runId: run.id,
      participants: users.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/*
====================================
FULL QUIZ SIMULATION (DEV ONLY)
POST /quiz/:id/full-sim
====================================
*/
router.post("/:id/full-sim", async (req, res) => {
  console.log("🔥 FULL SIM START");

  try {
    const quizId = Number(req.params.id);

    // 1. USERS
    let users = await prisma.user.findMany({ take: 10 });

    if (users.length < 10) {
      const toCreate = 10 - users.length;

      for (let i = 0; i < toCreate; i++) {
        const user = await prisma.user.create({
          data: {
            email: `sim${Date.now()}_${i}@test.com`,
            password: "123456",
          },
        });
        users.push(user);
      }
    }

    // 2. QUESTIONS + ANSWERS
    let questions = await prisma.quizQuestion.findMany({
      where: { quizId },
      include: { answers: true },
    });

    // 👉 SI NO HAY PREGUNTAS, CREARLAS
    if (questions.length === 0) {
      for (let i = 1; i <= 5; i++) {
        const q = await prisma.quizQuestion.create({
          data: {
            quizId,
            text: `Pregunta ${i}`,
            readTime: 3000,
            answerTime: 5000,
          },
        });

        await prisma.quizAnswer.createMany({
         data: [
         { questionId: q.id, text: "Respuesta A", isCorrect: true },
         { questionId: q.id, text: "Respuesta B", isCorrect: false },
         { questionId: q.id, text: "Respuesta C", isCorrect: false },
         { questionId: q.id, text: "Respuesta D", isCorrect: false },
         ],
       });
      }

      questions = await prisma.quizQuestion.findMany({
        where: { quizId },
        include: { answers: true },
      });
    }

    // 3. CREATE RUN
    const run = await prisma.quizRun.create({
      data: {
        quizId,
        startedAt: new Date(),
        phase: "FINISHED",
      },
    });

    // 4. PARTICIPANTS
    await prisma.quizParticipant.createMany({
      data: users.map((u) => ({
        quizRunId: run.id,
        userId: u.id,
        score: 0,
      })),
    });

    // 5. GENERAR RESPUESTAS (OPTIMIZADO)
    const answersToCreate = [];
    const scoresByUser = {};

    for (const q of questions) {
      for (const u of users) {
        const randomAnswer =
          q.answers[Math.floor(Math.random() * q.answers.length)];

        const isCorrect = randomAnswer.isCorrect;
        const score = isCorrect ? Math.floor(Math.random() * 1000) : 0;

        answersToCreate.push({
          quizRunId: run.id,
          questionId: q.id,
          userId: u.id,
          answer: randomAnswer.text,
          isCorrect,
          score,
          responseTimeMs: Math.floor(Math.random() * 5000),
        });

        scoresByUser[u.id] = (scoresByUser[u.id] || 0) + score;
      }
    }

    // 🔥 INSERT MASIVO
    await prisma.quizRunAnswer.createMany({
      data: answersToCreate,
    });

    // 🔥 UPDATE MASIVO DE SCORES
    await Promise.all(
      Object.entries(scoresByUser).map(([userId, score]) =>
        prisma.quizParticipant.updateMany({
          where: {
            quizRunId: run.id,
            userId: Number(userId),
          },
          data: { score },
        })
      )
    );

    // 6. RANKING FINAL
    const ranking = await prisma.quizParticipant.findMany({
      where: { quizRunId: run.id },
      orderBy: { score: "desc" },
    });

    // 7. FINALIZAR RUN
    await prisma.quizRun.update({
      where: { id: run.id },
      data: {
        phase: "FINISHED",
      },
    });

    console.log("✅ FULL SIM END");

    res.json({
      ok: true,
      runId: run.id,
      players: users.length,
      questions: questions.length,
      ranking,
    });
  } catch (err) {
    console.error("❌ FULL SIM ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

import { distributeRewards } from "../services/distributeRewards.js";

/*
====================================
DISTRIBUTE REWARDS (TEST)
POST /quiz/run/:id/distribute
====================================
*/
router.post("/run/:id/distribute", async (req, res) => {
  try {
    const result = await distributeRewards(Number(req.params.id));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/*
====================================
SET REWARD RULES + TITLE
POST /quiz/:id/reward-rules
====================================
*/
router.post("/:id/reward-rules", async (req, res) => {
  try {
    const quizId = Number(req.params.id);
    const { title, rewardRules } = req.body;

    if (!Array.isArray(rewardRules)) {
      return res.status(400).json({ error: "rewardRules debe ser array" });
    }

    // actualizar título del quiz
    await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title: title ?? undefined,
      },
    });

    // borrar reglas anteriores
    await prisma.rewardRule.deleteMany({
      where: { quizId },
    });

    // crear nuevas reglas
    await prisma.rewardRule.createMany({
      data: rewardRules.map((r) => ({
        quizId,
        type: r.type,
        positionFrom: r.fromPosition,
        positionTo: r.toPosition,
        percent: r.percent,
      })),
    });

    res.json({
      ok: true,
      message: "Quiz actualizado con reward rules",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/*
====================================
PREVIEW ECONOMY
GET /quiz/:id/preview-economy
====================================
*/
router.get("/:id/preview-economy", async (req, res) => {
  try {
    const quizId = Number(req.params.id);

    // 1. último run (o el más reciente)
    const run = await prisma.quizRun.findFirst({
      where: { quizId },
      orderBy: { createdAt: "desc" },
    });

    if (!run) {
      return res.status(400).json({ error: "No hay run para este quiz" });
    }

    // 2. participantes reales (CORRECTO)
    const participants = await prisma.quizParticipant.count({
      where: { quizRunId: run.id },
    });

    const CREDIT_PER_JOIN = 1;
    const totalPool = participants * CREDIT_PER_JOIN;

    // 3. reparto base
    const jackpot = totalPool * 0.05; // fijo
    const remainingAfterJackpot = totalPool - jackpot;

    // 4. reglas
    const rules = await prisma.rewardRule.findMany({
      where: { quizId },
    });

    let creatorPercent = 0;
    let adminPercent = 0;
    let playersPercent = 0;

    for (const r of rules) {
      if (r.type === "CREATOR") creatorPercent += r.percent;
      if (r.type === "ADMIN") adminPercent += r.percent;
      if (r.type === "POSITION") playersPercent += r.percent;
    }

    // 5. cálculos
    const creatorAmount = (remainingAfterJackpot * creatorPercent) / 100;
    const adminAmount = (remainingAfterJackpot * adminPercent) / 100;
    const playersPool =
      (remainingAfterJackpot * playersPercent) / 100;

    // 6. distribución jugadores
    const playerRules = rules.filter((r) => r.type === "POSITION");

    const playerDistribution = playerRules.map((r) => {
      const from = r.positionFrom;
      const to = r.positionTo;

      const count = to - from + 1;

      const total = (playersPool * r.percent) / playersPercent;
      const perUser = total / count;

      return {
        from,
        to,
        percent: r.percent,
        winners: count,
        total,
        perUser,
      };
    });

    res.json({
      participants,
      totalPool,

      jackpot,

      creator: {
        percent: creatorPercent,
        amount: creatorAmount,
      },

      admin: {
        percent: adminPercent,
        amount: adminAmount,
      },

      playersPool,

      playerDistribution,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});