import request from "supertest";
import app from "../src/index.js";

describe("STRESS TEST - BIG QUIZ (5000 players)", () => {
  let quizId;
  let runId;

  const USERS = 5000;

  it("creates quiz", async () => {
    const res = await request(app)
      .post("/quiz/draft")
      .set("x-user-id", "1")
      .send({ title: "BIG STRESS QUIZ" });

    expect(res.statusCode).toBe(200);
    quizId = res.body.id;
  });

  it("creates reward rules", async () => {
    const res = await request(app)
      .post(`/quiz/${quizId}/reward-rules`)
      .send({
        title: "BIG STRESS QUIZ",
        rewardRules: [
          { type: "POSITION", fromPosition: 1, toPosition: 1, percent: 50 },
          { type: "POSITION", fromPosition: 2, toPosition: 10, percent: 30 },
          { type: "POSITION", fromPosition: 11, toPosition: 5000, percent: 20 },
        ],
      });

    expect(res.statusCode).toBe(200);
  });

  it("creates run", async () => {
    const res = await request(app).post(`/quiz/${quizId}/test-run`);
    expect(res.statusCode).toBe(200);
    runId = res.body.runId;
  });

  it("simulates 5000 participants joining parallel", async () => {
    const promises = [];

    for (let i = 1; i <= USERS; i++) {
      promises.push(
        request(app)
          .post(`/quiz-run/${runId}/answer`)
          .set("x-user-id", String(i))
          .send({
            questionId: 1,
            answer: "A",
            score: Math.floor(Math.random() * 1000),
          })
      );
    }

    const results = await Promise.all(promises);

    const failed = results.filter(r => r.statusCode >= 400);

    expect(failed.length).toBe(0);
  }, 60000);

  it("distributes rewards safely", async () => {
    const res = await request(app).post(
      `/quiz-run/${runId}/distribute`
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("validates economy integrity", async () => {
    const res = await request(app).get(
      `/quiz/${quizId}/preview-economy`
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.totalPool).toBeGreaterThan(0);
  });
});