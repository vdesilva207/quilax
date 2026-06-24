import request from "supertest";
import app from "../../src/index.js";

describe("SCALABILITY TESTS - Incremental Load", () => {
  const results = {
    "1K": { users: 1000, time: 0, errors: 0 },
    "5K": { users: 5000, time: 0, errors: 0 },
    "10K": { users: 10000, time: 0, errors: 0 },
    "50K": { users: 50000, time: 0, errors: 0 },
    "100K": { users: 100000, time: 0, errors: 0 },
  };

  // Test 1: Concurrent Quiz Joins
  describe("Concurrent Quiz Joins", () => {
    let quizId, runId;

    beforeAll(async () => {
      // Create test quiz
      const quizRes = await request(app)
        .post("/quiz/draft")
        .set("x-user-id", "1")
        .send({ title: "Scalability Test Quiz" });
      
      quizId = quizRes.body.id;

      // Add reward rules
      await request(app)
        .post(`/quiz/${quizId}/reward-rules`)
        .send({
          rewardRules: [
            { type: "POSITION", fromPosition: 1, toPosition: 1, percent: 50 },
            { type: "POSITION", fromPosition: 2, toPosition: 10, percent: 50 },
          ],
        });

      // Create run
      const runRes = await request(app)
        .post(`/quiz/${quizId}/test-run`);
      
      runId = runRes.body.runId;
    });

    // Test with 1K concurrent users
    it("handles 1K concurrent joins", async () => {
      const startTime = Date.now();
      const promises = [];
      let errors = 0;

      for (let i = 0; i < 1000; i++) {
        promises.push(
          request(app)
            .post(`/quiz-play/${runId}/join`)
            .set("Authorization", `Bearer mock-token-${i}`)
            .then(() => {})
            .catch(() => {
              errors++;
            })
        );
      }

      await Promise.allSettled(promises);
      const endTime = Date.now();

      results["1K"].time = endTime - startTime;
      results["1K"].errors = errors;

      console.log(`1K Users: ${results["1K"].time}ms, ${errors} errors`);
      expect(errors).toBeLessThan(50); // Allow 5% error rate
    }, 30000);

    // Test with 5K concurrent users
    it("handles 5K concurrent joins", async () => {
      const startTime = Date.now();
      const promises = [];
      let errors = 0;

      for (let i = 0; i < 5000; i++) {
        promises.push(
          request(app)
            .post(`/quiz-play/${runId}/join`)
            .set("Authorization", `Bearer mock-token-${i}`)
            .then(() => {})
            .catch(() => {
              errors++;
            })
        );
      }

      await Promise.allSettled(promises);
      const endTime = Date.now();

      results["5K"].time = endTime - startTime;
      results["5K"].errors = errors;

      console.log(`5K Users: ${results["5K"].time}ms, ${errors} errors`);
      expect(errors).toBeLessThan(250); // Allow 5% error rate
    }, 60000);

    // Test with 10K concurrent users
    it("handles 10K concurrent joins", async () => {
      const startTime = Date.now();
      const promises = [];
      let errors = 0;

      for (let i = 0; i < 10000; i++) {
        promises.push(
          request(app)
            .post(`/quiz-play/${runId}/join`)
            .set("Authorization", `Bearer mock-token-${i}`)
            .then(() => {})
            .catch(() => {
              errors++;
            })
        );
      }

      await Promise.allSettled(promises);
      const endTime = Date.now();

      results["10K"].time = endTime - startTime;
      results["10K"].errors = errors;

      console.log(`10K Users: ${results["10K"].time}ms, ${errors} errors`);
      expect(errors).toBeLessThan(500); // Allow 5% error rate
    }, 120000);
  });

  // Test 2: Database Performance
  describe("Database Performance", () => {
    it("maintains sub-100ms response times under load", async () => {
      const promises = [];
      const responseTimes = [];

      for (let i = 0; i < 1000; i++) {
        promises.push(
          request(app)
            .get("/quizzes")
            .then((res) => {
              responseTimes.push(res.responseTime);
            })
        );
      }

      await Promise.all(promises);
      
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      console.log(`Avg Response Time: ${avgResponseTime}ms`);
      console.log(`Max Response Time: ${maxResponseTime}ms`);

      expect(avgResponseTime).toBeLessThan(100); // Sub 100ms average
      expect(maxResponseTime).toBeLessThan(500); // Sub 500ms max
    });
  });

  // Test 3: Memory Usage
  describe("Memory Usage", () => {
    it("doesn't exceed memory limits under load", async () => {
      const initialMemory = process.memoryUsage();
      
      // Create load
      const promises = [];
      for (let i = 0; i < 5000; i++) {
        promises.push(
          request(app)
            .get("/quizzes")
            .then(() => {})
        );
      }
      
      await Promise.all(promises);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      // Should not increase by more than 100MB under test load
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  // Summary
  afterAll(() => {
    console.log("\n=== SCALABILITY TEST RESULTS ===");
    Object.entries(results).forEach(([scale, result]) => {
      if (result.time > 0) {
        console.log(`${scale}: ${result.time}ms, ${result.errors} errors`);
      }
    });
  });
});
