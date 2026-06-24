import request from "supertest";
import app from "../src/index.js";

describe("QUIZ FULL SYSTEM E2E", () => {
  let quizId;
  let runId;

  // 1. CREATE QUIZ
  it("creates quiz", async () => {
    const res = await request(app)
      .post("/quiz/draft")
      .set("x-user-id", "1")
      .send({ title: "E2E Quiz" });

    expect(res.statusCode).toBe(200);
    quizId = res.body.id;
  });

  // 2. SET REWARD RULES
  it("sets reward rules", async () => {
    const res = await request(app)
      .post(`/quiz/${quizId}/reward-rules`)
      .send({
        title: "E2E Quiz Updated",
        rewardRules: [
          { type: "POSITION", fromPosition: 1, toPosition: 1, percent: 50 },
          { type: "POSITION", fromPosition: 2, toPosition: 3, percent: 30 },
          { type: "POSITION", fromPosition: 4, toPosition: 10, percent: 20 },
        ],
      });

    expect(res.statusCode).toBe(200);
  });

  // 3. CREATE RUN
  it("creates run", async () => {
    const res = await request(app).post(`/quiz/${quizId}/test-run`);

    expect(res.statusCode).toBe(200);
    runId = res.body.runId;
  });

  // 4. SIMULATE ECONOMY PREVIEW
  it("preview economy", async () => {
    const res = await request(app).get(
      `/quiz/${quizId}/preview-economy`
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.totalPool).toBeDefined();
    expect(res.body.jackpot).toBeGreaterThan(0);
  });

  // 5. SIMULATE ANSWERS (fake gameplay)
  it("adds fake answers", async () => {
    const users = [1, 2, 3, 4, 5];

    for (const userId of users) {
      await request(app)
        .post(`/quiz-run/${runId}/answer`)
        .set("x-user-id", String(userId))
        .send({
          questionId: 1,
          answer: "A",
          score: Math.floor(Math.random() * 1000),
        });
    }
  });

  // 6. DISTRIBUTE REWARDS
  it("distributes rewards", async () => {
    const res = await request(app).post(
      `/quiz-run/${runId}/distribute`
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.totalPrizeCredits).toBeDefined();
  });

  // 7. FINAL CHECK (economy consistency)
  it("validates final economy state", async () => {
    const res = await request(app).get(
      `/quiz/${quizId}/preview-economy`
    );

    expect(res.statusCode).toBe(200);

    // sanity check: pool exists
    expect(res.body.totalPool).toBeGreaterThan(0);
  });
});