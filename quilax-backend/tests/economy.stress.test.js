import request from "supertest";
import app from "../src/index.js";

describe("ECONOMY STRESS TEST (100 QUIZZES)", () => {
  const quizIds = [];
  const runIds = [];

  it("creates 100 quizzes", async () => {
    for (let i = 0; i < 100; i++) {
      const res = await request(app)
        .post("/quiz/draft")
        .set("x-user-id", "1")
        .send({ title: `Quiz ${i}` });

      expect(res.statusCode).toBe(200);
      quizIds.push(res.body.id);
    }
  });

  it("adds reward rules to all quizzes", async () => {
    for (const quizId of quizIds) {
      const res = await request(app)
        .post(`/quiz/${quizId}/reward-rules`)
        .send({
          title: `Quiz ${quizId}`,
          rewardRules: [
            { type: "POSITION", fromPosition: 1, toPosition: 1, percent: 50 },
            { type: "POSITION", fromPosition: 2, toPosition: 3, percent: 30 },
            { type: "POSITION", fromPosition: 4, toPosition: 10, percent: 20 },
          ],
        });

      expect(res.statusCode).toBe(200);
    }
  });

  it("creates runs for all quizzes", async () => {
    for (const quizId of quizIds) {
      const res = await request(app).post(`/quiz/${quizId}/test-run`);

      expect(res.statusCode).toBe(200);
      runIds.push(res.body.runId);
    }
  });

  it("distributes all runs (stress economy)", async () => {
    for (const runId of runIds) {
      const res = await request(app).post(
        `/quiz-run/${runId}/distribute`
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
    }
  });

  it("validates no crashes in economy system", async () => {
    expect(quizIds.length).toBe(100);
    expect(runIds.length).toBe(100);
  });
});