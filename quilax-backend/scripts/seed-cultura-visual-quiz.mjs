#!/usr/bin/env node
/**
 * Seed a playable quiz: complex questions + images + bots.
 * Usage: DATABASE_URL=... node scripts/seed-cultura-visual-quiz.mjs
 */
import prisma from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';
import redis from '../src/lib/redis.js';
import { getEarlyJoinBonus } from '../src/constants/earlyJoinBonus.js';

const VICENTE_ID = Number(process.env.SEED_USER_ID || 16);
const BOT_COUNT = Number(process.env.SEED_BOT_COUNT || 89);
const START_IN_SEC = Number(process.env.SEED_START_IN_SEC || 240);
const stamp = `${Date.now()}`;
const hash = await bcrypt.hash('Test123456', 8);

await prisma.$executeRawUnsafe(
  `ALTER TABLE "QuizQuestion" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`
);

await prisma.user.update({
  where: { id: VICENTE_ID },
  data: { balance: 5000, isOver18: true, emailVerified: true, password: hash },
});

await prisma.quiz.updateMany({
  where: { status: 'PUBLISHED' },
  data: { status: 'FINISHED' },
});
const oldRuns = await prisma.quizRun.findMany({
  where: { phase: { not: 'FINISHED' } },
  select: { id: true },
});
for (const r of oldRuns) {
  await prisma.quizRun.update({
    where: { id: r.id },
    data: { phase: 'FINISHED', phaseEndsAt: new Date() },
  });
}

const questionsData = [
  {
    text: '¿Qué civilización construyó pirámides escalonadas como esta en Mesoamérica?',
    imageUrl: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=900&q=80',
    correct: 'Culturas mesoamericanas (prehispánicas)',
    wrong: ['Egipcia faraónica', 'Inca del Cuzco', 'China de la dinastía Ming'],
    readTime: 6,
    answerTime: 15,
  },
  {
    text: 'Si la Tierra tarda ~365,25 días en orbitar el Sol, ¿por qué hay años bisiestos?',
    imageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=900&q=80',
    correct: 'Para compensar la fracción de día extra de la órbita',
    wrong: [
      'Porque la Luna se acelera cada 4 años',
      'Por el cambio de polos magnéticos',
      'Porque el calendario empezó en febrero',
    ],
    readTime: 7,
    answerTime: 16,
  },
  {
    text: 'Mirando este paisaje de montaña/fiordo, ¿qué proceso lo excavó principalmente?',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80',
    correct: 'Glaciares',
    wrong: ['Volcanes submarinos', 'Corrientes de marea únicamente', 'Impactos de meteoritos'],
    readTime: 5,
    answerTime: 14,
  },
  {
    text: 'En pintura clásica, ¿qué técnica usa capas semitransparentes de color sobre un dibujo?',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=900&q=80',
    correct: 'Veladura (glaze)',
    wrong: ['Puntillismo seco', 'Fresco al secco exclusivo', 'Collage de temple'],
    readTime: 6,
    answerTime: 15,
  },
  {
    text: 'Un coche a 90 km/h durante 20 minutos recorre aproximadamente…',
    imageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=900&q=80',
    correct: '30 km',
    wrong: ['18 km', '45 km', '60 km'],
    readTime: 5,
    answerTime: 14,
  },
  {
    text: '¿Qué gas de efecto invernadero emite principalmente la quema de combustibles fósiles?',
    imageUrl: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=900&q=80',
    correct: 'CO₂ (dióxido de carbono)',
    wrong: ['Ozono estratosférico (O₃)', 'Helio (He)', 'Nitrógeno puro (N₂)'],
    readTime: 6,
    answerTime: 15,
  },
  {
    text: 'La Torre Eiffel se inauguró para la Exposición Universal de…',
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=80',
    correct: '1889',
    wrong: ['1789', '1918', '1945'],
    readTime: 5,
    answerTime: 12,
  },
  {
    text: 'En ajedrez, si el rey está amenazado y no hay jugada legal que lo salve, es…',
    imageUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=900&q=80',
    correct: 'Jaque mate',
    wrong: [
      'Ahogado (stalemate)',
      'Tablas por repetición automática',
      'Victoria por tiempo solo',
    ],
    readTime: 5,
    answerTime: 12,
  },
  {
    text: '¿Qué órgano produce la insulina de forma natural en el cuerpo humano?',
    imageUrl: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=900&q=80',
    correct: 'Páncreas',
    wrong: ['Hígado', 'Bazo', 'Riñón'],
    readTime: 5,
    answerTime: 12,
  },
  {
    text: 'Si mezclas luz roja y verde en un monitor RGB a máxima intensidad, percibes…',
    imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=900&q=80',
    correct: 'Amarillo',
    wrong: ['Cian', 'Magenta', 'Blanco'],
    readTime: 5,
    answerTime: 12,
  },
  {
    text: '¿Quién escribió "Así habló Zaratustra"?',
    imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=900&q=80',
    correct: 'Friedrich Nietzsche',
    wrong: ['Immanuel Kant', 'Jean-Paul Sartre', 'Platón'],
    readTime: 5,
    answerTime: 12,
  },
  {
    text: 'Si la demanda sube y la oferta se mantiene, el precio de equilibrio tiende a…',
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=900&q=80',
    correct: 'Subir',
    wrong: ['Bajar siempre', 'Quedarse fijo por ley', 'Volverse negativo'],
    readTime: 6,
    answerTime: 14,
  },
];

const scheduledAt = new Date(Date.now() + START_IN_SEC * 1000);

const quiz = await prisma.quiz.create({
  data: {
    title: 'Cultura visual Quilax (12Q)',
    status: 'PUBLISHED',
    difficulty: 7,
    credits: 800,
    creatorId: VICENTE_ID,
    schedules: { create: { scheduledAt, status: 'RESERVED' } },
    rewardRules: {
      create: [
        { type: 'POSITION', positionFrom: 1, positionTo: 1, percent: 25 },
        { type: 'POSITION', positionFrom: 2, positionTo: 3, percent: 20 },
        { type: 'POSITION', positionFrom: 4, positionTo: 10, percent: 20 },
        { type: 'POSITION', positionFrom: 11, positionTo: 50, percent: 20 },
        { type: 'POSITION', positionFrom: 51, positionTo: 100, percent: 15 },
      ],
    },
    questions: {
      create: questionsData.map((q) => ({
        text: q.text,
        imageUrl: q.imageUrl,
        maxPoints: 1000,
        readTime: q.readTime,
        answerTime: q.answerTime,
        answers: {
          create: [
            { text: q.correct, isCorrect: true },
            ...q.wrong.map((w) => ({ text: w, isCorrect: false })),
          ],
        },
      })),
    },
  },
  include: {
    questions: { include: { answers: true }, orderBy: { id: 'asc' } },
  },
});

let bots = await prisma.user.findMany({
  where: { email: { startsWith: 'botmass@' } },
  select: { id: true },
  orderBy: { id: 'asc' },
  take: BOT_COUNT,
});
if (bots.length < BOT_COUNT) {
  const need = BOT_COUNT - bots.length;
  console.log('creating bots', need);
  const rows = [];
  for (let i = 0; i < need; i++) {
    const n = bots.length + i + 1;
    rows.push({
      email: `botmass@${n}.${stamp}.test.local`,
      password: hash,
      role: 'USER',
      balance: 50,
      isOver18: true,
      emailVerified: true,
      username: `bm${stamp}${n}`.slice(0, 28),
    });
  }
  for (let s = 0; s < rows.length; s += 40) {
    await prisma.user.createMany({
      data: rows.slice(s, s + 40),
      skipDuplicates: true,
    });
  }
  bots = await prisma.user.findMany({
    where: { email: { startsWith: 'botmass@' } },
    select: { id: true },
    orderBy: { id: 'asc' },
    take: BOT_COUNT,
  });
}
const botIds = bots.slice(0, BOT_COUNT).map((b) => b.id);
if (botIds.length < BOT_COUNT) {
  throw new Error(`bots ${botIds.length}/${BOT_COUNT}`);
}

const run = await prisma.quizRun.create({
  data: {
    quizId: quiz.id,
    phase: 'PRE_START',
    currentIndex: 0,
    totalPrizeCredits: BOT_COUNT,
    startedAt: new Date(),
    phaseEndsAt: scheduledAt,
  },
});

for (let start = 0; start < BOT_COUNT; start += 50) {
  const slice = botIds.slice(start, start + 50);
  await prisma.quizParticipant.createMany({
    data: slice.map((uid, j) => {
      const pos = start + j + 1;
      return {
        quizRunId: run.id,
        userId: uid,
        status: 'ACTIVE',
        score: getEarlyJoinBonus(pos),
      };
    }),
    skipDuplicates: true,
  });
  await prisma.quizScore.createMany({
    data: slice.map((uid, j) => {
      const pos = start + j + 1;
      return {
        quizRunId: run.id,
        userId: uid,
        score: getEarlyJoinBonus(pos),
      };
    }),
    skipDuplicates: true,
  });
}

await prisma.quizEnrollment.upsert({
  where: { quizId_userId: { quizId: quiz.id, userId: VICENTE_ID } },
  create: { quizId: quiz.id, userId: VICENTE_ID },
  update: {},
});

await redis.set(`quizRun:${run.id}:questions`, JSON.stringify(quiz.questions));
await redis.set(`quizRun:${run.id}:phase`, 'PRE_START');

const count = await prisma.quizParticipant.count({
  where: { quizRunId: run.id },
});
const nextPos = count + 1;

console.log(
  JSON.stringify(
    {
      quizId: quiz.id,
      runId: run.id,
      title: quiz.title,
      questions: quiz.questions.length,
      withImages: quiz.questions.filter((q) => q.imageUrl).length,
      botsJoined: count,
      yourPosition: nextPos,
      yourEarlyJoinBonus: getEarlyJoinBonus(nextPos),
      startsAt: scheduledAt.toISOString(),
      startsInSec: Math.round((scheduledAt - Date.now()) / 1000),
      url: `http://localhost:8081/quiz/${quiz.id}`,
      lobbyUrl: `http://localhost:8081/quiz/run/${run.id}`,
    },
    null,
    2
  )
);

await prisma.$disconnect();
process.exit(0);
