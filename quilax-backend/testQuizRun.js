const BASE_URL = "http://localhost:3000";

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function runTest() {
  console.log("🚀 Starting quiz...");

  // 1. Start quiz
  const startRes = await fetch(`${BASE_URL}/quiz/run/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quizId: 2 }),
  });

  const startData = await startRes.json();
  const quizRunId = startData.id;

  console.log("✅ Quiz started:", quizRunId);

  let finished = false;

  while (!finished) {
    // 2. Read state
    const stateRes = await fetch(`${BASE_URL}/quiz/run/${quizRunId}/state`);
    const state = await stateRes.json();

    console.log("\n📺 STATE:");
    console.log(state);

    if (state.phase === "FINISHED") {
      console.log("\n🏁 QUIZ FINISHED");
      finished = true;
      break;
    }

    // 3. Tick
    const tickRes = await fetch(`${BASE_URL}/quiz/run/tick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizRunId }),
    });

    const tickData = await tickRes.json();

    console.log("\n⏭️ TICK:");
    console.log({
      phase: tickData.phase,
      currentIndex: tickData.currentIndex,
      phaseEndsAt: tickData.phaseEndsAt,
    });

    // espera 1s entre ticks
    await sleep(1000);
  }
}

runTest().catch(console.error);

