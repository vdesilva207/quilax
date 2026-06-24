import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../src/index.js";
import prisma from "../src/lib/prisma.js";

function signToken(userId, role = "USER") {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
}

async function createUser(emailPrefix, balance = 10) {
  return prisma.user.create({
    data: {
      email: `${emailPrefix}-${Date.now()}-${Math.random()}@test.local`,
      password: "test-password",
      role: "USER",
      balance,
    },
  });
}

async function createRunForJoinTests() {
  const creator = await createUser("creator", 100);
  const quiz = await prisma.quiz.create({
    data: {
      creatorId: creator.id,
      title: "Quiz Early Join Bonus",
      status: "DRAFT",
      requestedDate: new Date(),
    },
  });

  await prisma.rewardRule.create({
    data: {
      quizId: quiz.id,
      type: "POSITION",
      positionFrom: 1,
      positionTo: 1,
      percent: 100,
    },
  });

  const run = await prisma.quizRun.create({
    data: {
      quizId: quiz.id,
      phase: "PRE_START",
      currentIndex: 0,
      totalPrizeCredits: 0,
    },
  });

  return { runId: run.id };
}

async function seedParticipants(runId, count) {
  if (count <= 0) return;

  const users = await Promise.all(
    Array.from({ length: count }).map((_, idx) => createUser(`seed-${runId}-${idx}`, 5))
  );

  await prisma.quizParticipant.createMany({
    data: users.map((u) => ({
      quizRunId: runId,
      userId: u.id,
      status: "ACTIVE",
      score: 0,
    })),
  });

  await prisma.quizScore.createMany({
    data: users.map((u) => ({
      quizRunId: runId,
      userId: u.id,
      score: 0,
    })),
  });
}

describe("EARLY JOIN BONUS", () => {
  beforeAll(() => {
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = "test-secret";
    }
  });

  it("gives 600 points to first player", async () => {
    const { runId } = await createRunForJoinTests();
    const user = await createUser("first-player", 5);
    const token = signToken(user.id);

    const res = await request(app)
      .post(`/quiz-play/${runId}/join`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.joined).toBe(true);
    expect(res.body.joinPosition).toBe(1);
    expect(res.body.earlyJoinBonus).toBe(600);

    const participant = await prisma.quizParticipant.findUnique({
      where: {
        quizRunId_userId: { quizRunId: runId, userId: user.id },
      },
    });

    const score = await prisma.quizScore.findUnique({
      where: {
        quizRunId_userId: { quizRunId: runId, userId: user.id },
      },
    });

    expect(participant?.score).toBe(600);
    expect(score?.score).toBe(600);
  });

  const curveCases = [
    { position: 5, expectedBonus: 520 },
    { position: 10, expectedBonus: 450 },
    { position: 20, expectedBonus: 360 },
    { position: 50, expectedBonus: 175 },
    { position: 80, expectedBonus: 95 },
    { position: 90, expectedBonus: 70 },
    { position: 100, expectedBonus: 70 },
    { position: 101, expectedBonus: 0 },
  ];

  it.each(curveCases)(
    "assigns $expectedBonus points at position #$position",
    async ({ position, expectedBonus }) => {
      const { runId } = await createRunForJoinTests();
      await seedParticipants(runId, position - 1);

      const user = await createUser(`player-${position}`, 5);
      const token = signToken(user.id);

      const res = await request(app)
        .post(`/quiz-play/${runId}/join`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.joined).toBe(true);
      expect(res.body.joinPosition).toBe(position);
      expect(res.body.earlyJoinBonus).toBe(expectedBonus);

      const participant = await prisma.quizParticipant.findUnique({
        where: {
          quizRunId_userId: { quizRunId: runId, userId: user.id },
        },
      });

      const score = await prisma.quizScore.findUnique({
        where: {
          quizRunId_userId: { quizRunId: runId, userId: user.id },
        },
      });

      expect(participant?.score).toBe(expectedBonus);
      expect(score?.score).toBe(expectedBonus);
    }
  );
});
