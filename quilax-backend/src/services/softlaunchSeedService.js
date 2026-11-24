/**
 * Non-destructive soft-launch quiz seed.
 * Creates 2–3 PUBLISHED quizzes with schedules in the near future.
 * Does NOT finish/cancel existing quizzes.
 */
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

const DEFAULT_QUESTIONS = [
  {
    text: '¿Cuál es la capital de España?',
    correct: 'Madrid',
    wrong: ['Barcelona', 'Valencia', 'Sevilla'],
    readTime: 4,
    answerTime: 12,
  },
  {
    text: '2 + 2 × 2 = ¿?',
    correct: '6',
    wrong: ['8', '4', '10'],
    readTime: 4,
    answerTime: 12,
  },
  {
    text: '¿Qué planeta es conocido como el Planeta Rojo?',
    correct: 'Marte',
    wrong: ['Venus', 'Júpiter', 'Mercurio'],
    readTime: 4,
    answerTime: 12,
  },
  {
    text: '¿En qué año llegó el hombre a la Luna?',
    correct: '1969',
    wrong: ['1965', '1972', '1959'],
    readTime: 5,
    answerTime: 12,
  },
  {
    text: '¿Cuál es el océano más grande?',
    correct: 'Pacífico',
    wrong: ['Atlántico', 'Índico', 'Ártico'],
    readTime: 4,
    answerTime: 12,
  },
];

function questionCreates(slice) {
  return slice.map((q) => ({
    text: q.text,
    maxPoints: 1000,
    readTime: q.readTime,
    answerTime: q.answerTime,
    answers: {
      create: [
        { text: q.correct, isCorrect: true },
        ...q.wrong.map((w) => ({ text: w, isCorrect: false })),
      ],
    },
  }));
}

async function ensureHostUser() {
  const email = (process.env.SEED_EMAIL || 'quilax@appquilax.com').toLowerCase();
  const passwordPlain = process.env.SEED_ADMIN_PASSWORD || 'Admin1234!';
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'ADMIN',
      isBanned: false,
      emailVerified: true,
      isOver18: true,
    },
    create: {
      email,
      password: passwordHash,
      adminPassword: passwordHash,
      role: 'ADMIN',
      fullName: 'Quilax Softlaunch',
      username: 'quilax',
      balance: 500,
      isOver18: true,
      emailVerified: true,
      idVerified: true,
    },
  });

  // Ensure playable balance for TF smoke without granting infinite credits on every seed
  if ((user.balance || 0) < 50) {
    return prisma.user.update({
      where: { id: user.id },
      data: { balance: 100 },
    });
  }
  return user;
}

/**
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<{ created: object[], skipped: boolean, hostEmail: string }>}
 */
/** Soft-launch TF quizzes: lobby starts ~90s after first join (tips=join-start). */
export function isJoinStartQuiz(quiz) {
  if (!quiz) return false;
  return (
    quiz.tips === 'join-start' ||
    String(quiz.description || '').includes('[join-start]')
  );
}

export async function seedSoftlaunchQuizzes(opts = {}) {
  const force = !!opts.force;
  const existing = await prisma.quiz.count({ where: { status: 'PUBLISHED' } });
  if (existing > 0 && !force) {
    return {
      created: [],
      skipped: true,
      reason: `already_have_${existing}_published`,
      hostEmail: null,
    };
  }

  const host = await ensureHostUser();

  // Retire previous smoke quizzes so home only shows fresh join-start ones.
  if (force) {
    await prisma.quiz.updateMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { tips: 'join-start' },
          { title: { startsWith: 'Smoke TF' } },
          { description: { contains: '[join-start]' } },
        ],
      },
      data: { status: 'FINISHED' },
    });
    await prisma.quizRun.updateMany({
      where: {
        phase: { not: 'FINISHED' },
        quiz: { title: { startsWith: 'Smoke TF' } },
      },
      data: { phase: 'FINISHED', phaseEndsAt: new Date() },
    });
  }

  const now = Date.now();
  // Placeholder schedule far ahead — first enroll rewrites to now+90s.
  const placeholderMs = 30 * 24 * 60 * 60 * 1000;
  const schedules = [
    {
      title: 'Smoke TF · Cultura rápida',
      category: 'Cultura',
      credits: 5,
      questions: DEFAULT_QUESTIONS.slice(0, 5),
    },
    {
      title: 'Smoke TF · Números y lógica',
      category: 'Matemáticas',
      credits: 5,
      questions: [
        DEFAULT_QUESTIONS[1],
        {
          text: '¿Cuántos lados tiene un hexágono?',
          correct: '6',
          wrong: ['5', '7', '8'],
          readTime: 4,
          answerTime: 12,
        },
        {
          text: 'La mitad de 100 es…',
          correct: '50',
          wrong: ['25', '75', '20'],
          readTime: 3,
          answerTime: 10,
        },
        DEFAULT_QUESTIONS[0],
        DEFAULT_QUESTIONS[4],
      ],
    },
    {
      title: 'Smoke TF · Mundo y ciencia',
      category: 'Ciencias',
      credits: 10,
      questions: DEFAULT_QUESTIONS,
    },
  ];

  const created = [];
  for (let i = 0; i < schedules.length; i++) {
    const spec = schedules[i];
    const scheduledAt = new Date(now + placeholderMs + i * 60_000);
    const quiz = await prisma.quiz.create({
      data: {
        title: spec.title,
        status: 'PUBLISHED',
        difficulty: 3,
        credits: spec.credits,
        creatorId: host.id,
        category: spec.category,
        language: 'es',
        tips: 'join-start',
        description:
          'Quiz de prueba soft-launch. Empieza ~90s después de que alguien se una.',
        schedules: { create: { scheduledAt, status: 'RESERVED' } },
        rewardRules: {
          create: [
            { type: 'POSITION', positionFrom: 1, positionTo: 1, percent: 40 },
            { type: 'POSITION', positionFrom: 2, positionTo: 3, percent: 30 },
            { type: 'POSITION', positionFrom: 4, positionTo: 10, percent: 30 },
          ],
        },
        questions: { create: questionCreates(spec.questions) },
      },
      select: {
        id: true,
        title: true,
        credits: true,
        tips: true,
        schedules: { select: { scheduledAt: true } },
      },
    });
    created.push({
      id: quiz.id,
      title: quiz.title,
      credits: quiz.credits,
      joinStart: true,
      scheduledAt: quiz.schedules[0]?.scheduledAt,
    });
  }

  return { created, skipped: false, hostEmail: host.email };
}
