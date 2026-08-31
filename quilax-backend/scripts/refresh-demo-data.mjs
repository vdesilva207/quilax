/**
 * Refresca datos de demo para desarrollo:
 * - Playtest jugable en unos minutos
 * - Quizzes de prueba reprogramados (próximos días)
 * - Temporada activa + puntos de ranking
 * - Jugadores de prueba (si faltan)
 * - Bots del playtest
 *
 * Uso: node scripts/refresh-demo-data.mjs
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const HERMES_EMAIL = 'hermesdesilvaortiz@gmail.com';
const FAKE_PASSWORD = 'TestUser123';
const FIRST = [
  'Ana', 'Luis', 'María', 'Carlos', 'Laura', 'Pedro', 'Sofía', 'Diego', 'Elena', 'Javier',
  'Paula', 'Miguel', 'Lucía', 'Andrés', 'Carmen', 'Hugo', 'Irene', 'Pablo', 'Clara', 'Raúl',
];
const LAST = [
  'García', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Ruiz', 'Díaz', 'Hernández', 'Moreno',
];

function hourOffset(h) {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

async function ensureHermes() {
  let hermes =
    (await prisma.user.findFirst({
      where: { email: HERMES_EMAIL, role: 'USER' },
    })) ||
    (await prisma.user.findFirst({ where: { role: 'USER' } }));
  if (!hermes) throw new Error('No hay usuario USER / Hermes');
  if ((hermes.balance ?? 0) < 50) {
    hermes = await prisma.user.update({
      where: { id: hermes.id },
      data: { balance: { increment: 100 } },
    });
  }
  return hermes;
}

async function ensureTestPlayers(count = 40) {
  const hash = await bcrypt.hash(FAKE_PASSWORD, 8);
  const users = [];
  for (let i = 1; i <= count; i++) {
    const email = `jugador.prueba.${String(i).padStart(3, '0')}@quilax.test`;
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 3) % LAST.length];
    let user = await prisma.user.findFirst({
      where: { email, role: 'USER' },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          password: hash,
          fullName: `${first} ${last}`,
          username: `jugador${String(i).padStart(3, '0')}`,
          role: 'USER',
          balance: 25 + (i % 40),
          currency: 'EUR',
          country: 'ES',
          isOver18: true,
          emailVerified: true,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          balance: Math.max(user.balance ?? 0, 25 + (i % 40)),
          isOver18: true,
          emailVerified: true,
        },
      });
    }
    users.push(user);
  }
  return users;
}

async function ensureSeason(players) {
  const now = new Date();
  let season = await prisma.season.findFirst({
    where: { startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { startsAt: 'desc' },
  });

  const { seasonNameFromDate } = await import('../src/utils/seasonDuration.js');
  const funName = seasonNameFromDate(now);

  if (!season) {
    season = await prisma.season.create({
      data: {
        name: funName,
        startsAt: now,
        endsAt: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
        jackpotPool: 500,
        color: '#EF4444',
      },
    });
  } else {
    const patch = {};
    if ((season.jackpotPool ?? 0) < 100) patch.jackpotPool = 500;
    // Renombrar nombres viejos ("Temporada …", "Fénix · Julio")
    if (
      !season.name ||
      /^Temporada\b/i.test(season.name) ||
      /\s*[·•]\s*\S+$/.test(season.name)
    ) {
      patch.name = funName;
    }
    if (!season.color || season.color === '#6366f1') patch.color = '#EF4444';
    if (Object.keys(patch).length) {
      season = await prisma.season.update({ where: { id: season.id }, data: patch });
    }
  }

  // Ranking demo
  for (let i = 0; i < Math.min(players.length, 25); i++) {
    const points = 1200 - i * 35 + (i % 5) * 7;
    await prisma.seasonUser.upsert({
      where: {
        userId_seasonId: { userId: players[i].id, seasonId: season.id },
      },
      update: { points },
      create: { seasonId: season.id, userId: players[i].id, points },
    });
  }

  await ensurePreviousSeason(players);

  return season;
}

async function ensurePreviousSeason(players) {
  const now = new Date();
  let previous = await prisma.season.findFirst({
    where: { endsAt: { lte: now } },
    orderBy: { endsAt: 'desc' },
  });

  if (!previous) {
    const endsAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const startsAt = new Date(endsAt.getTime() - 45 * 24 * 60 * 60 * 1000);
    previous = await prisma.season.create({
      data: {
        name: 'Aurora',
        color: '#8B5CF6',
        startsAt,
        endsAt,
        jackpotPool: 2500,
      },
    });
  }

  const winnerCount = await prisma.seasonWinner.count({ where: { seasonId: previous.id } });
  if (winnerCount > 0) return previous;

  const jackpot = previous.jackpotPool || 2500;
  const elite = [0.15, 0.1, 0.07, 0.05, 0.04, 0.03, 0.025, 0.02, 0.015, 0.01];
  const take = Math.min(players.length, 40);

  for (let i = 0; i < take; i++) {
    const position = i + 1;
    const points = 1800 - i * 28;
    const credits =
      position <= 10
        ? Math.floor(jackpot * elite[position - 1])
        : Math.floor(jackpot * 0.008);

    await prisma.seasonUser.upsert({
      where: {
        userId_seasonId: { userId: players[i].id, seasonId: previous.id },
      },
      update: { points },
      create: { seasonId: previous.id, userId: players[i].id, points },
    });

    await prisma.seasonWinner.upsert({
      where: {
        seasonId_userId: { seasonId: previous.id, userId: players[i].id },
      },
      update: {
        position,
        points,
        creditsAwarded: credits,
        type: 'TOP',
        rewardDescription: `Premio temporada · puesto ${position}`,
      },
      create: {
        seasonId: previous.id,
        userId: players[i].id,
        type: 'TOP',
        position,
        points,
        creditsAwarded: credits,
        rewardDescription: `Premio temporada · puesto ${position}`,
      },
    });
  }

  return previous;
}

async function refreshPlaytest(creatorId) {
  const QUESTIONS = [
    { text: '¿Capital de España?', correct: 'Madrid', wrong: ['Barcelona', 'Valencia', 'Sevilla'] },
    { text: '¿7 × 8?', correct: '56', wrong: ['54', '63', '48'] },
    { text: '¿Autor de Don Quijote?', correct: 'Miguel de Cervantes', wrong: ['Lope de Vega', 'Quevedo', 'Góngora'] },
    { text: '¿Planeta más cercano al Sol?', correct: 'Mercurio', wrong: ['Venus', 'Marte', 'Tierra'] },
    { text: '¿Azul + amarillo?', correct: 'Verde', wrong: ['Naranja', 'Morado', 'Rosa'] },
  ];

  let quiz = await prisma.quiz.findFirst({
    where: { title: { startsWith: '[PLAYTEST]' } },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { questions: true } } },
  });

  const startAt = new Date(Date.now() + 3 * 60 * 1000);

  if (!quiz || quiz._count.questions === 0) {
    quiz = await prisma.quiz.create({
      data: {
        title: '[PLAYTEST] Cultura general express',
        category: 'Cultura',
        description: 'Quiz de prueba: únete y empieza en unos segundos.',
        difficulty: 3,
        status: 'PUBLISHED',
        credits: 0,
        requestedDate: startAt,
        creatorId,
        schedules: { create: { scheduledAt: startAt, status: 'RESERVED' } },
        questions: {
          create: QUESTIONS.map((q) => ({
            text: q.text,
            maxPoints: 1000,
            readTime: 5,
            answerTime: 10,
            answers: {
              create: [
                { text: q.correct, isCorrect: true },
                ...q.wrong.map((t) => ({ text: t, isCorrect: false })),
              ],
            },
          })),
        },
        rewardRules: {
          create: [
            { type: 'POSITION', positionFrom: 1, positionTo: 1, percent: 50 },
            { type: 'POSITION', positionFrom: 2, positionTo: 3, percent: 30 },
            { type: 'CREATOR', percent: 10 },
            { type: 'ADMIN', percent: 10 },
          ],
        },
      },
    });
  } else {
    await prisma.quizRun.updateMany({
      where: { quizId: quiz.id, phase: { not: 'FINISHED' } },
      data: { phase: 'FINISHED', phaseEndsAt: new Date(), finishedAt: new Date() },
    });
    await prisma.quiz.update({
      where: { id: quiz.id },
      data: {
        status: 'PUBLISHED',
        requestedDate: startAt,
      },
    });
    const schedule = await prisma.quizSchedule.findFirst({
      where: { quizId: quiz.id },
      orderBy: { id: 'desc' },
    });
    if (schedule) {
      await prisma.quizSchedule.update({
        where: { id: schedule.id },
        data: { scheduledAt: startAt, status: 'RESERVED' },
      });
    } else {
      await prisma.quizSchedule.create({
        data: { quizId: quiz.id, scheduledAt: startAt, status: 'RESERVED' },
      });
    }
  }

  return { quizId: quiz.id, startAt };
}

async function refreshDemoQuizzes(creatorId, players) {
  const topics = [
    'Geografía express', 'Historia flash', 'Cine clásico', 'Deportes', 'Ciencia',
    'Literatura', 'Música', 'Tecnología', 'Arte', 'Naturaleza',
    'Gastronomía', 'Capitales', 'Fútbol', 'Series', 'Inventos',
  ];

  // Reprogramar quizzes PUBLISHED con título "prueba" o crear nuevos
  const existing = await prisma.quiz.findMany({
    where: {
      status: 'PUBLISHED',
      title: { contains: 'prueba' },
    },
    include: { schedules: { take: 1, orderBy: { id: 'desc' } } },
    orderBy: { id: 'asc' },
    take: 20,
  });

  const updated = [];
  for (let i = 0; i < existing.length; i++) {
    const q = existing[i];
    const when = hourOffset(1 + i * 6); // cada ~6h a partir de +1h
    await prisma.quiz.update({
      where: { id: q.id },
      data: { requestedDate: when, status: 'PUBLISHED' },
    });
    if (q.schedules[0]) {
      await prisma.quizSchedule.update({
        where: { id: q.schedules[0].id },
        data: { scheduledAt: when, status: 'RESERVED' },
      });
    } else {
      await prisma.quizSchedule.create({
        data: { quizId: q.id, scheduledAt: when, status: 'RESERVED' },
      });
    }
    updated.push({ id: q.id, at: when });
  }

  // Si hay pocos, crear más
  const need = Math.max(0, 12 - existing.length);
  for (let i = 0; i < need; i++) {
    const topic = topics[i % topics.length];
    const when = hourOffset(2 + (existing.length + i) * 5);
    const creator = i % 3 === 0 ? { id: creatorId } : players[i % players.length];
    const quiz = await prisma.quiz.create({
      data: {
        title: `${topic} · Quiz de prueba ${existing.length + i + 1}`,
        category: topic.split(' ')[0],
        description: `Partida de demostración sobre ${topic}.`,
        difficulty: (i % 8) + 1,
        status: 'PUBLISHED',
        credits: 0,
        requestedDate: when,
        creatorId: creator.id,
        schedules: { create: { scheduledAt: when, status: 'RESERVED' } },
        questions: {
          create: Array.from({ length: 5 }, (_, qi) => ({
            text: `Pregunta ${qi + 1} de ${topic}: ¿cuál es correcta?`,
            maxPoints: 1000,
            readTime: 5,
            answerTime: 12,
            answers: {
              create: [
                { text: `Correcta ${qi + 1}`, isCorrect: true },
                { text: `Falsa A ${qi + 1}`, isCorrect: false },
                { text: `Falsa B ${qi + 1}`, isCorrect: false },
                { text: `Falsa C ${qi + 1}`, isCorrect: false },
              ],
            },
          })),
        },
        rewardRules: {
          create: [
            { type: 'POSITION', positionFrom: 1, positionTo: 1, percent: 50 },
            { type: 'POSITION', positionFrom: 2, positionTo: 3, percent: 30 },
            { type: 'CREATOR', percent: 10 },
            { type: 'ADMIN', percent: 10 },
          ],
        },
      },
    });
    updated.push({ id: quiz.id, at: when, created: true });
  }

  return updated;
}

async function main() {
  const hermes = await ensureHermes();
  console.log('Creator:', hermes.email, hermes.id);

  const players = await ensureTestPlayers(40);
  console.log('Jugadores prueba:', players.length, `(pass: ${FAKE_PASSWORD})`);

  const season = await ensureSeason([hermes, ...players]);
  console.log('Temporada:', season.id, season.name);

  const playtest = await refreshPlaytest(hermes.id);
  console.log('Playtest:', playtest);

  const demos = await refreshDemoQuizzes(hermes.id, players);
  console.log('Quizzes demo reprogramados/creados:', demos.length);

  // Bots si el servicio existe
  try {
    const { ensurePlaytestBotsReady } = await import('../src/services/playtestBots.js');
    const bots = await ensurePlaytestBotsReady();
    console.log('Bots:', bots.map((b) => b.username).join(', '));
  } catch (e) {
    console.warn('Bots skip:', e.message);
  }

  const published = await prisma.quiz.count({
    where: {
      status: 'PUBLISHED',
      schedules: { some: { scheduledAt: { gt: new Date() } } },
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        seasonId: season.id,
        playtestQuizId: playtest.quizId,
        playtestAt: playtest.startAt,
        upcomingPublished: published,
        testPlayers: players.length,
        tip: 'Recarga Inicio en la app. Playtest en ~3 min; resto repartidos en los próximos días.',
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
