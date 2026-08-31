/**
 * ULTRA stress — bigger than 3×100k / prior 5×250k attempts.
 *
 * - Seed up to PLAYERS users (default 400k)
 * - QUIZZES runs (default 6) with long PRE_START hold
 * - HTTP join storm with GLOBAL concurrency (default 180 — sweet spot;
 *   prior 5×120=600 in-flight collapsed Postgres with P2028)
 * - Bulk-fill to PLAYERS each, then answer + ranking (ZREVRANK) + nav
 *
 *   node scripts/stress-ultra.mjs
 *   PLAYERS=400000 QUIZZES=6 JOIN_CONCURRENCY=180 HTTP_JOIN_CAP=60000 node scripts/stress-ultra.mjs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import http from "node:http";
import { performance } from "node:perf_hooks";
import { writeFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET missing");

const PLAYERS = Math.max(1000, Number(process.env.PLAYERS || 400_000));
const QUIZZES = Math.max(1, Math.min(12, Number(process.env.QUIZZES || 6)));
/** Global in-flight joins across ALL quizzes (not per-quiz). */
const JOIN_CONCURRENCY = Math.max(40, Number(process.env.JOIN_CONCURRENCY || 180));
const HTTP_JOIN_CAP = Math.max(
  1000,
  Math.min(PLAYERS, Number(process.env.HTTP_JOIN_CAP || 60_000))
);
const ANSWER_SAMPLE = Math.min(
  PLAYERS,
  Math.max(1000, Number(process.env.ANSWER_SAMPLE || 60_000))
);
const RANK_SAMPLE = Math.min(
  PLAYERS,
  Math.max(1000, Number(process.env.RANK_SAMPLE || 120_000))
);
const ANSWER_CONCURRENCY = Math.max(20, Math.min(100, Number(process.env.ANSWER_CONCURRENCY || 80)));
const RANK_CONCURRENCY = Math.max(50, Number(process.env.RANK_CONCURRENCY || 250));
const NAV_CONCURRENCY = Math.max(0, Number(process.env.NAV_CONCURRENCY || 0));
const DOMAIN = "quilax.local";
const PREFIX = "loadtest";
const PASSWORD = "LoadTest2026!";
const RUN = `ultra${Date.now().toString(36)}`;
const __dir = dirname(fileURLToPath(import.meta.url));
const LOG = join(__dir, `stress-ultra-${RUN}.log`);
const REPORT = join(__dir, `stress-ultra-report-${RUN}.json`);

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: JOIN_CONCURRENCY + RANK_CONCURRENCY + NAV_CONCURRENCY + 200,
});

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  appendFileSync(LOG, line + "\n");
}

function tokenFor(user) {
  return jwt.sign({ id: user.id, role: user.role || "USER" }, JWT_SECRET, {
    expiresIn: "12h",
  });
}

function request(method, path, { token, body, timeoutMs = 30_000 } = {}) {
  return new Promise((resolve) => {
    const started = performance.now();
    const payload = body !== undefined ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 3001,
        path,
        method,
        agent,
        timeout: timeoutMs,
        headers: {
          accept: "application/json",
          "user-agent": `quilax-ultra/${RUN}`,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(payload
            ? {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let data = null;
          const text = Buffer.concat(chunks).toString("utf8");
          try {
            data = text ? JSON.parse(text) : null;
          } catch {
            data = null;
          }
          const ok =
            (res.statusCode >= 200 && res.statusCode < 400) ||
            !!data?.joined ||
            !!data?.alreadyJoined ||
            !!data?.allowed ||
            data?.me != null;
          resolve({
            ok,
            status: res.statusCode,
            ms: performance.now() - started,
            data,
            error: ok ? null : data?.error || `status_${res.statusCode}`,
          });
        });
      }
    );
    req.on("error", (err) =>
      resolve({
        ok: false,
        status: 0,
        ms: performance.now() - started,
        error: err.code || err.message,
      })
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({
        ok: false,
        status: 0,
        ms: performance.now() - started,
        error: "timeout",
      });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function pct(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function summarize(label, samples, wallMs) {
  const ok = samples.filter((s) => s.ok);
  const ms = ok.map((s) => s.ms).sort((a, b) => a - b);
  const errors = {};
  for (const s of samples) {
    if (!s.ok) {
      const k = String(s.error || "err").slice(0, 100);
      errors[k] = (errors[k] || 0) + 1;
    }
  }
  return {
    label,
    n: samples.length,
    ok: ok.length,
    fail: samples.length - ok.length,
    okRate: samples.length ? +(ok.length / samples.length).toFixed(4) : 0,
    rps: wallMs > 0 ? +((samples.length / wallMs) * 1000).toFixed(1) : 0,
    latencyMs: {
      p50: +pct(ms, 50).toFixed(1),
      p95: +pct(ms, 95).toFixed(1),
      p99: +pct(ms, 99).toFixed(1),
      max: ms.length ? +ms[ms.length - 1].toFixed(1) : 0,
    },
    topErrors: Object.entries(errors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([error, count]) => ({ error, count })),
  };
}

async function mapPool(items, concurrency, fn, label) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  const t0 = performance.now();
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
      done++;
      if (done % 5000 === 0 || done === items.length) {
        const elapsed = (performance.now() - t0) / 1000;
        process.stdout.write(
          `\r  ${label} ${done}/${items.length} (${(done / elapsed).toFixed(0)} rps)   `
        );
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  process.stdout.write("\n");
  return results;
}

async function ensureUsers(target) {
  const existing = await prisma.user.count({
    where: { email: { endsWith: `@${DOMAIN}` }, role: "USER" },
  });
  log(`users existing=${existing} target=${target}`);
  if (existing < target) {
    const hash = await bcrypt.hash(PASSWORD, 4);
    const need = target - existing;
    const start = existing + 1;
    const batch = 2500;
    for (let off = 0; off < need; off += batch) {
      const n = Math.min(batch, need - off);
      const data = [];
      for (let j = 0; j < n; j++) {
        const i = start + off + j;
        data.push({
          email: `${PREFIX}${i}@${DOMAIN}`,
          username: `U${i}_${RUN.slice(-4)}`,
          password: hash,
          role: "USER",
          balance: 40,
          currency: "EUR",
          country: "ES",
          emailVerified: true,
          isOver18: true,
          idVerified: true,
          fullName: `Load ${i}`,
        });
      }
      try {
        await prisma.user.createMany({ data, skipDuplicates: true });
      } catch {
        for (const row of data) {
          try {
            await prisma.user.create({ data: row });
          } catch {
            /* skip */
          }
        }
      }
      if ((off + n) % 25000 === 0 || off + n >= need) {
        log(`seeded ${Math.min(off + n, need)}/${need}`);
      }
    }
  }
  await prisma.user.updateMany({
    where: {
      email: { endsWith: `@${DOMAIN}` },
      role: "USER",
      OR: [{ balance: { lt: 15 } }, { isOver18: false }],
    },
    data: { balance: 40, isOver18: true, emailVerified: true },
  });
  return prisma.user.findMany({
    where: { email: { endsWith: `@${DOMAIN}` }, role: "USER" },
    select: { id: true, email: true, role: true },
    take: target,
    orderBy: { id: "asc" },
  });
}

async function createQuiz(creatorId, idx) {
  return prisma.quiz.create({
    data: {
      title: `[ULTRA-${idx}] ${RUN}`,
      status: "APPROVED",
      creatorId,
      category: "Cultura",
      language: "es",
      description: `Ultra stress quiz ${idx}`,
      questions: {
        create: Array.from({ length: 5 }, (_, i) => ({
          text: `ULTRA Q${idx}-${i} ${RUN}`,
          maxPoints: 1000,
          readTime: 2,
          answerTime: 20,
          answers: {
            create: [
              { text: `OK-${idx}-${i}`, isCorrect: true },
              { text: `NO-${idx}-${i}-a`, isCorrect: false },
              { text: `NO-${idx}-${i}-b`, isCorrect: false },
              { text: `NO-${idx}-${i}-c`, isCorrect: false },
            ],
          },
        })),
      },
    },
    include: {
      questions: { include: { answers: true }, orderBy: { id: "asc" } },
    },
  });
}

async function holdLobby(runIds) {
  await Promise.all(
    runIds.map((id) =>
      prisma.quizRun.update({
        where: { id },
        data: {
          phase: "PRE_START",
          phaseEndsAt: new Date(Date.now() + 12 * 3600_000),
          finishedAt: null,
        },
      })
    )
  );
}

async function bulkFill(runId, users, target) {
  const existing = new Set(
    (
      await prisma.quizParticipant.findMany({
        where: { quizRunId: runId },
        select: { userId: true },
      })
    ).map((p) => p.userId)
  );
  const missing = users.filter((u) => !existing.has(u.id)).slice(0, Math.max(0, target - existing.size));
  const batch = 3000;
  for (let i = 0; i < missing.length; i += batch) {
    const slice = missing.slice(i, i + batch);
    await prisma.quizParticipant.createMany({
      data: slice.map((u) => ({
        quizRunId: runId,
        userId: u.id,
        status: "ACTIVE",
      })),
      skipDuplicates: true,
    });
    await prisma.quizRun.update({
      where: { id: runId },
      data: { totalPrizeCredits: { increment: slice.length } },
    });
    if ((i + slice.length) % 20000 === 0 || i + slice.length >= missing.length) {
      log(`  bulk run ${runId}: ${Math.min(i + slice.length, missing.length)}/${missing.length}`);
    }
  }
  return prisma.quizParticipant.count({ where: { quizRunId: runId } });
}

function startNav(tokens, quizIds, runIds, stopFlag, stats) {
  const paths = [
    () => request("GET", "/health"),
    () => request("GET", `/quiz-info/${quizIds[0]}`),
    () => request("GET", `/quiz-info/${quizIds[Math.min(1, quizIds.length - 1)]}`),
    () => request("GET", "/rankings/top?limit=20"),
    () =>
      request("GET", `/quiz-play/${runIds[0]}/state`, {
        token: tokens[0].token,
      }),
    () =>
      request("GET", `/quiz-play/${runIds[0]}/ranking?limit=5`, {
        token: tokens[Math.floor(Math.random() * Math.min(2000, tokens.length))]
          .token,
      }),
    () =>
      request("GET", "/profile/me", {
        token: tokens[Math.floor(Math.random() * Math.min(1000, tokens.length))]
          .token,
      }),
  ];
  return Array.from({ length: NAV_CONCURRENCY }, () =>
    (async () => {
      while (!stopFlag.stop) {
        await new Promise((r) => setTimeout(r, 40 + Math.random() * 60));
        if (stopFlag.stop) break;
        const r = await paths[Math.floor(Math.random() * paths.length)]();
        stats.n++;
        if (r.ok) stats.ok++;
        else stats.fail++;
        stats.ms.push(r.ms);
        if (stats.ms.length > 40_000) stats.ms.splice(0, 20_000);
      }
    })()
  );
}

async function main() {
  writeFileSync(LOG, "");
  log(`ULTRA STRESS ${RUN}`);
  log(
    `PLAYERS=${PLAYERS} QUIZZES=${QUIZZES} JOIN_C=${JOIN_CONCURRENCY} HTTP_CAP=${HTTP_JOIN_CAP} ANSWER=${ANSWER_SAMPLE} RANK=${RANK_SAMPLE} RANK_C=${RANK_CONCURRENCY} NAV_C=${NAV_CONCURRENCY}`
  );

  let health = await request("GET", "/health");
  for (let i = 0; i < 30 && !health.ok; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    health = await request("GET", "/health");
  }
  if (!health.ok) throw new Error("API unhealthy");
  log("health ok");

  const tSeed = performance.now();
  const users = await ensureUsers(PLAYERS);
  log(`users ready ${users.length} in ${((performance.now() - tSeed) / 1000).toFixed(1)}s`);
  if (users.length < PLAYERS * 0.9) {
    throw new Error(`Only ${users.length}/${PLAYERS} users`);
  }

  log("minting JWTs…");
  const tokens = users.map((u) => ({ user: u, token: tokenFor(u) }));

  const quizzes = [];
  for (let i = 1; i <= QUIZZES; i++) {
    quizzes.push(await createQuiz(users[0].id, i));
    log(`quiz${i}=${quizzes[i - 1].id}`);
  }

  const runs = [];
  for (let i = 0; i < QUIZZES; i++) {
    const ens = await request("POST", `/quiz-play/ensure-run/${quizzes[i].id}`, {
      token: tokens[0].token,
    });
    let runId = ens?.data?.run?.id;
    if (!runId) {
      const created = await prisma.quizRun.create({
        data: {
          quizId: quizzes[i].id,
          phase: "PRE_START",
          phaseEndsAt: new Date(Date.now() + 12 * 3600_000),
          totalPrizeCredits: 0,
        },
      });
      runId = created.id;
    }
    await holdLobby([runId]);
    runs.push(runId);
    log(`run${i + 1}=${runId}`);
  }

  const stopFlag = { stop: false };
  const navStats = { n: 0, ok: 0, fail: 0, ms: [] };
  // Nav starts after bulk — concurrent reads during join storm worsen P2028.

  const lobbyHold = setInterval(() => {
    holdLobby(runs).catch(() => {});
  }, 25_000);

  const tick = setInterval(async () => {
    try {
      const counts = await Promise.all(
        runs.map((id) =>
          prisma.quizParticipant.count({ where: { quizRunId: id } })
        )
      );
      log(
        `progress participants=[${counts.join(",")}] nav=${navStats.n} okRate=${
          navStats.n ? (navStats.ok / navStats.n).toFixed(3) : 0
        }`
      );
    } catch {
      /* ignore */
    }
  }, 20_000);

  // —— HTTP JOIN: sequential per quiz @ global sweet-spot concurrency ——
  // Parallel 5×120 (=600) previously starved Prisma (P2028).
  const httpSlice = tokens.slice(0, HTTP_JOIN_CAP);
  log(
    `HTTP JOIN STORM — ${HTTP_JOIN_CAP} players × ${QUIZZES} quizzes @ conc ${JOIN_CONCURRENCY} sequential (then bulk to ${PLAYERS})`
  );
  const tJoin = performance.now();
  const joinSummaries = [];
  const allJoinSamples = [];
  for (let qi = 0; qi < runs.length; qi++) {
    const runId = runs[qi];
    const tQ = performance.now();
    const samples = await mapPool(
      httpSlice,
      JOIN_CONCURRENCY,
      async ({ token }) => {
        let last = await request("POST", `/quiz-play/${runId}/join`, { token });
        if (
          !last.ok &&
          (last.status === 0 ||
            last.status === 500 ||
            last.status === 503 ||
            String(last.error || "").includes("interno") ||
            String(last.error || "").includes("transaction"))
        ) {
          await new Promise((r) => setTimeout(r, 80 + Math.random() * 120));
          last = await request("POST", `/quiz-play/${runId}/join`, { token });
        }
        return last;
      },
      `join-q${qi + 1}`
    );
    const wall = performance.now() - tQ;
    const s = summarize(`join_q${qi + 1}`, samples, wall);
    joinSummaries.push(s);
    allJoinSamples.push(...samples);
    log(
      `${s.label}: okRate=${s.okRate} rps=${s.rps} p95=${s.latencyMs.p95} fail=${s.fail}`
    );
    if (s.topErrors?.length) {
      log(`  errors: ${s.topErrors.map((e) => `${e.error}:${e.count}`).join(" | ")}`);
    }
  }
  const joinWall = performance.now() - tJoin;
  joinSummaries.push(summarize("join_all", allJoinSamples, joinWall));
  log(
    `join_all: okRate=${joinSummaries[joinSummaries.length - 1].okRate} wall=${(joinWall / 1000).toFixed(1)}s`
  );

  // —— BULK FILL ——
  log(`BULK FILL to ${PLAYERS} per quiz…`);
  const finalCounts = [];
  for (let i = 0; i < runs.length; i++) {
    const n = await bulkFill(runs[i], users, PLAYERS);
    finalCounts.push(n);
    log(`run ${runs[i]} participants=${n}`);
  }

  clearInterval(lobbyHold);
  clearInterval(tick);

  const navWorkers = startNav(
    tokens,
    quizzes.map((q) => q.id),
    runs,
    stopFlag,
    navStats
  );
  log(`nav workers ${NAV_CONCURRENCY} (post-bulk)`);

  // —— ANSWER ——
  const answerHold = setInterval(() => {
    Promise.all(
      runs.map((runId) =>
        prisma.quizRun.update({
          where: { id: runId },
          data: {
            phase: "QUESTION_ANSWER",
            currentIndex: 0,
            phaseStartedAt: new Date(),
            phaseEndsAt: new Date(Date.now() + 6 * 3600_000),
            finishedAt: null,
          },
        })
      )
    ).catch(() => {});
  }, 20_000);

  for (const runId of runs) {
    await prisma.quizRun.update({
      where: { id: runId },
      data: {
        phase: "QUESTION_ANSWER",
        currentIndex: 0,
        phaseStartedAt: new Date(),
        phaseEndsAt: new Date(Date.now() + 6 * 3600_000),
        finishedAt: null,
      },
    });
  }
  log("phase → QUESTION_ANSWER");

  const answerSlice = tokens.slice(0, ANSWER_SAMPLE);
  // Sequential per quiz — keep concurrency ≤ ~40 (Postgres max_connections=100 local).
  log(`ANSWER STORM ×${QUIZZES} — ${ANSWER_SAMPLE} @ ${ANSWER_CONCURRENCY} sequential`);
  const tAns = performance.now();
  const answerResults = [];
  for (let qi = 0; qi < runs.length; qi++) {
    const runId = runs[qi];
    const correct =
      quizzes[qi].questions[0]?.answers?.find((a) => a.isCorrect)?.text ||
      `OK-${qi + 1}-0`;
    const tQ = performance.now();
    const samples = await mapPool(
      answerSlice,
      ANSWER_CONCURRENCY,
      ({ token }) =>
        request("POST", `/quiz-play/${runId}/answer`, {
          token,
          body: { answer: correct },
        }),
      `ans-q${qi + 1}`
    );
    const s = summarize(`answer_q${qi + 1}`, samples, performance.now() - tQ);
    answerResults.push(s);
    log(`${s.label}: okRate=${s.okRate} rps=${s.rps} p95=${s.latencyMs.p95}`);
  }
  const ansWall = performance.now() - tAns;
  clearInterval(answerHold);

  // —— RANKING (my position for many users) ——
  for (const runId of runs) {
    await prisma.quizRun.update({
      where: { id: runId },
      data: {
        phase: "QUESTION_RANKING",
        phaseEndsAt: new Date(Date.now() + 30 * 60_000),
      },
    });
  }
  log("phase → QUESTION_RANKING");

  const rankSlice = tokens.slice(0, RANK_SAMPLE);
  // Ranking is mostly Redis — can parallelize more, but cap global sockets.
  const RANK_PARALLEL = Math.min(3, QUIZZES);
  log(
    `RANKING STORM ×${QUIZZES} — ${RANK_SAMPLE} getRanking @ ${RANK_CONCURRENCY} (batches of ${RANK_PARALLEL})`
  );
  const tRank = performance.now();
  const rankResults = [];
  for (let start = 0; start < runs.length; start += RANK_PARALLEL) {
    const batch = runs.slice(start, start + RANK_PARALLEL);
    const batchOut = await Promise.all(
      batch.map((runId, bi) => {
        const qi = start + bi;
        return mapPool(
          rankSlice,
          RANK_CONCURRENCY,
          ({ token }) =>
            request("GET", `/quiz-play/${runId}/ranking?limit=5`, { token }),
          `rank-q${qi + 1}`
        ).then((samples) => summarize(`rank_q${qi + 1}`, samples, 0));
      })
    );
    rankResults.push(...batchOut);
  }
  const rankWall = performance.now() - tRank;
  for (const s of rankResults) {
    s.rps = rankWall > 0 ? +((s.n / rankWall) * 1000).toFixed(1) : 0;
    log(`${s.label}: okRate=${s.okRate} rps=${s.rps} p95=${s.latencyMs.p95}`);
  }

  stopFlag.stop = true;
  await Promise.all(navWorkers);
  const navMs = navStats.ms.slice().sort((a, b) => a - b);
  const navSummary = {
    n: navStats.n,
    ok: navStats.ok,
    fail: navStats.fail,
    okRate: navStats.n ? +(navStats.ok / navStats.n).toFixed(4) : 0,
    latencyMs: {
      p50: +pct(navMs, 50).toFixed(1),
      p95: +pct(navMs, 95).toFixed(1),
    },
  };

  const after = await request("GET", "/health");
  const report = {
    run: RUN,
    at: new Date().toISOString(),
    biggerThan: "3×100k and aborted 5×250k@600conc",
    config: {
      PLAYERS,
      QUIZZES,
      JOIN_CONCURRENCY,
      HTTP_JOIN_CAP,
      ANSWER_SAMPLE,
      RANK_SAMPLE,
      RANK_CONCURRENCY,
      NAV_CONCURRENCY,
      quizIds: quizzes.map((q) => q.id),
      runIds: runs,
    },
    join: joinSummaries,
    participantsFinal: finalCounts,
    answer: answerResults,
    ranking: rankResults,
    nav: navSummary,
    stillAlive: after.ok,
    joinWallSec: +(joinWall / 1000).toFixed(1),
    answerWallSec: +(ansWall / 1000).toFixed(1),
    rankWallSec: +(rankWall / 1000).toFixed(1),
  };
  writeFileSync(REPORT, JSON.stringify(report, null, 2));

  log("========== ULTRA SUMMARY ==========");
  log(`participants: [${finalCounts.join(", ")}] target=${PLAYERS} quizzes=${QUIZZES}`);
  log(
    `HTTP join okRates: ${joinSummaries.map((s) => s.okRate).join(", ")} (${report.joinWallSec}s)`
  );
  log(
    `answer okRates: ${answerResults.map((s) => s.okRate).join(", ")} (${report.answerWallSec}s)`
  );
  log(
    `ranking okRates: ${rankResults.map((s) => s.okRate).join(", ")} (${report.rankWallSec}s)`
  );
  log(`nav okRate=${navSummary.okRate} n=${navSummary.n}`);
  log(`alive=${report.stillAlive}`);
  log(`report=${REPORT}`);
  log("==================================");
}

main()
  .catch((e) => {
    log(`FATAL ${e?.stack || e}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    agent.destroy();
  });
