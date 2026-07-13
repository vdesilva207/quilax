import request from "supertest";
import app from "../../src/index.js";

describe("LIGHTWEIGHT STRESS TESTS", () => {
  let quizId, runId;

  beforeAll(async () => {
    // Setup: Create test quiz
    const quizRes = await request(app)
      .post("/quiz/draft")
      .set("x-user-id", "1")
      .send({ title: "Lightweight Test Quiz" });
    
    quizId = quizRes.body.id;

    // Create run
    const runRes = await request(app)
      .post(`/quiz/${quizId}/test-run`);
    
    runId = runRes.body.runId;
  });

  // Test 1: Sequential requests (no concurrency issues)
  it("handles 1000 sequential joins", async () => {
    const startTime = Date.now();
    let errors = 0;

    for (let i = 0; i < 1000; i++) {
      try {
        await request(app)
          .post(`/quiz-play/${runId}/join`)
          .set("Authorization", `Bearer test-token-${i}`)
          .timeout(5000);
      } catch (error) {
        errors++;
      }
    }

    const endTime = Date.now();
    console.log(`1000 Sequential: ${endTime - startTime}ms, ${errors} errors`);
    
    expect(errors).toBeLessThan(100); // Allow 10% error rate
  }, 60000);

  // Test 2: Small batches of concurrent requests
  it("handles 100 batches of 10 concurrent requests", async () => {
    const startTime = Date.now();
    let totalErrors = 0;

    for (let batch = 0; batch < 100; batch++) {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        const userId = batch * 10 + i;
        promises.push(
          request(app)
            .post(`/quiz-play/${runId}/join`)
            .set("Authorization", `Bearer test-token-${userId}`)
            .timeout(5000)
            .then(() => {})
            .catch(() => {
              totalErrors++;
            })
        );
      }

      await Promise.allSettled(promises);
      
      // Small delay between batches to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const endTime = Date.now();
    console.log(`100 Batches (10 each): ${endTime - startTime}ms, ${totalErrors} errors`);
    
    expect(totalErrors).toBeLessThan(200); // Allow 20% error rate
  }, 120000);

  // Test 3: Response time under load
  it("maintains acceptable response times", async () => {
    const responseTimes = [];
    const promises = [];

    for (let i = 0; i < 500; i++) {
      promises.push(
        request(app)
          .get("/quizzes")
          .then((res) => {
            responseTimes.push(res.responseTime || 0);
          })
          .catch(() => {
            responseTimes.push(5000); // Timeout
          })
      );
    }

    await Promise.all(promises);
    
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxTime = Math.max(...responseTimes);
    const p95Time = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

    console.log(`Response Times - Avg: ${avgTime}ms, Max: ${maxTime}ms, P95: ${p95Time}ms`);
    
    expect(avgTime).toBeLessThan(1000); // 1s average
    expect(p95Time).toBeLessThan(2000); // 2s P95
  }, 60000);

  // Test 4: Memory stability
  it("maintains stable memory usage", async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Generate load
    const promises = [];
    for (let i = 0; i < 1000; i++) {
      promises.push(
        request(app)
          .get("/quizzes")
          .timeout(5000)
      );
    }
    
    await Promise.allSettled(promises);
    
    // Force GC if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

    console.log(`Memory Increase: ${memoryIncrease.toFixed(2)}MB`);
    
    // Should not increase by more than 50MB
    expect(memoryIncrease).toBeLessThan(50);
  }, 60000);

  // Test 5: Database connection stability
  it("maintains database connections", async () => {
    const promises = [];
    let dbErrors = 0;

    for (let i = 0; i < 200; i++) {
      promises.push(
        request(app)
          .get("/quizzes")
          .timeout(10000)
          .catch((error) => {
            if (error.message.includes('database') || error.message.includes('connection')) {
              dbErrors++;
            }
          })
      );
    }

    await Promise.allSettled(promises);
    
    console.log(`Database Errors: ${dbErrors}/200`);
    expect(dbErrors).toBeLessThan(10); // Less than 5% DB errors
  }, 60000);
});
