import request from "supertest";
import app from "../src/index.js"; // ajusta ruta si hace falta
import jwt from "jsonwebtoken";
import prisma from "../src/lib/prisma.js";

describe("QUIZ FLOW COMPLETO", () => {
  let quizId;
  let runId;
  let adminToken;

  beforeAll(async () => {
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = "test-secret";
    }

    const admin = await prisma.user.upsert({
      where: { email: "admin-test@quilax.local" },
      update: { role: "ADMIN" },
      create: {
        email: "admin-test@quilax.local",
        password: "not-used-in-this-test",
        role: "ADMIN",
      },
    });

    adminToken = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  it("1. crear draft", async () => {
    const res = await request(app)
      .post("/quiz/draft")
      .set("x-user-id", "1")
      .send({ title: "Quiz test" });

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBeDefined();

    quizId = res.body.id;
  });

  it("2. añadir reward rules", async () => {
    const res = await request(app)
      .post(`/quiz/${quizId}/reward-rules`)
      .send({
        title: "Quiz test economía",
        rewardRules: [
          {
            type: "POSITION",
            fromPosition: 1,
            toPosition: 1,
            percent: 50,
          },
          {
            type: "POSITION",
            fromPosition: 2,
            toPosition: 3,
            percent: 30,
          },
          {
            type: "POSITION",
            fromPosition: 4,
            toPosition: 10,
            percent: 20,
          },
        ],
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("3. crear test run", async () => {
    const res = await request(app)
      .post(`/quiz/${quizId}/test-run`);

    expect(res.statusCode).toBe(200);
    expect(res.body.runId).toBeDefined();

    runId = res.body.runId;
  });

  it("4. preview economy", async () => {
    const res = await request(app)
      .get(`/quiz/${quizId}/preview-economy`);

    expect(res.statusCode).toBe(200);
    expect(res.body.totalPool).toBeDefined();
    expect(res.body.playersPool).toBeDefined();
  });

  it("5. distribuir rewards", async () => {
    const res = await request(app)
      .post(`/quiz-run/${runId}/distribute`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});