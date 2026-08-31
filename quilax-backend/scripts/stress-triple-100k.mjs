/**
 * Stress: 3 quizzes × 100k players in parallel + background navigation.
 *
 * Reality: 300k simultaneous TCP sockets won't fit on one Mac.
 * This runs REAL HTTP joins/answers toward 100k/quiz with sustained
 * high concurrency across 3 runs at once, while a nav pool hammers
 * health/quiz-info/rankings/home/profile/posts/messages.
 *
 * Usage:
 *   node scripts/stress-triple-100k.mjs
 *   PLAYERS=100000 JOIN_CONCURRENCY=250 NAV_CONCURRENCY=300 node scripts/stress-triple-100k.mjs
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

const PLAYERS = Math.max(1000, Number(process.env.PLAYERS || 100_000));
const JOIN_CONCURRENCY = Math.max(50, Number(process.env.JOIN_CONCURRENCY || 250));
const ANSWER_CONCURRENCY = Math.max(50, Number(process.env.ANSWER_CONCURRENCY || 250));
const NAV_CONCURRENCY = Math.max(50, Number(process.env.NAV_CONCURRENCY || 300));
const ANSWER_SAMPLE = Math.min(
  PLAYERS,
  Math.max(1000, Number(process.env.ANSWER_SAMPLE || 20_000))
);
const DOMAIN = "quilax.local";
const PREFIX = "loadtest";
const PASSWORD = "LoadTest2026!";
const RUN = `t100k${Date.now().toString(36)}`;
const __dir = dirname(fileURLToPath(import.meta.url));
const LOG = join(__dir, `stress-triple-${RUN}.log`);
const REPORT = join(__dir, `stress-triple-report-${RUN}.json`);

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: JOIN_CONCURRENCY * 3 + NAV_CONCURRENCY + 100,
});

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  appendFileSync(LOG, line + "\n");
}

function tokenFor(user) {
  return jwt.sign({ id: user.id, role: user.role || "USER" }, JWT_SECRET, {
    expiresIn: "6h",
  });
}

function request(method, path, { token, body, timeoutMs = 25_000 } = {}) {
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
          "user-agent": `quilax-triple/${RUN}`,
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
            !!data?.allowed;
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
      if (done % 2000 === 0 || done === items.length) {
        const elapsed = (performance.now() - t0) / 1000;
        const rps = done / elapsed;
        process.stdout.write(
          `\r  ${label} ${done}/${items.length} (${rps.toFixed(0)} rps)   `
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
    const batch = 2000;
    for (let off = 0; off < need; off += batch) {
      const n = Math.min(batch, need - off);
      const data = [];
      for (let j = 0; j < n; j++) {
        const i = start + off + j;
        data.push({
          email: `${PREFIX}${i}@${DOMAIN}`,
          username: `L${i}_${RUN.slice(-5)}`,
          password: hash,
          role: "USER",
          balance: 50,
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
      if ((off + n) % 10000 === 0 || off + n >= need) {
        log(`seeded ${Math.min(off + n, need)}/${need}`);
      }
    }
  }
  await prisma.user.updateMany({
    where: {
      email: { endsWith: `@${DOMAIN}` },
      role: "USER",
      OR: [{ balance: { lt: 20 } }, { isOver18: false }, { emailVerified: false }],
    },
    data: { balance: 50, isOver18: true, emailVerified: true, idVerified: true },
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
      title: `[T100K-${idx}] ${RUN}`,
      status: "APPROVED",
      creatorId,
      category: "Cultura",
      language: "es",
      description: `Triple 100k stress quiz ${idx}`,
      questions: {
        create: Array.from({ length: 5 }, (_, i) => ({
          text: `T100K Q${idx}-${i} ${RUN}`,
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

function startNavWorkers(tokens, quizIds, runIds, stopFlag, stats) {
  const paths = [
    () => request("GET", "/health"),
    () => request("GET", `/quiz-info/${quizIds[0]}`),
    () => request("GET", `/quiz-info/${quizIds[1]}`),
    () => request("GET", `/quiz-info/${quizIds[2]}`),
    () => request("GET", "/rankings/top?limit=20"),
    () => request("GET", "/home", { token: tokens[0].token }),
    () =>
      request("GET", "/profile/me", {
        token: tokens[Math.floor(Math.random() * Math.min(500, tokens.length))]
          .token,
      }),
    () =>
      request("GET", `/quiz-play/${runIds[0]}/state`, {
        token: tokens[1]?.token || tokens[0].token,
      }),
    () =>
      request("GET", `/quiz-play/${runIds[1]}/ranking`, {
        token: tokens[2]?.token || tokens[0].token,
      }),
    () =>
      request("POST", "/auth/login", {
        body: {
          email: tokens[Math.floor(Math.random() * Math.min(1000, tokens.length))]
            .user.email,
          password: PASSWORD,
        },
      }),
  ];

  const workers = [];
  for (let w = 0; w < NAV_CONCURRENCY; w++) {
    workers.push(
      (async () => {
        while (!stopFlag.stop) {
          // Pace nav so it doesn't starve joins / kill the process
          await new Promise((r) => setTimeout(r, 30 + Math.random() * 40));
          if (stopFlag.stop) break;
          const fn = paths[Math.floor(Math.random() * paths.length)];
          const r = await fn();
          stats.n++;
          if (r.ok) stats.ok++;
          else {
            stats.fail++;
            if (r.status === 0) stats.connFail = (stats.connFail || 0) + 1;
          }
          stats.ms.push(r.ms);
          if (stats.ms.length > 50_000) stats.ms.splice(0, 25_000);
        }
      })()
    );
  }
  return workers;
}

async function main() {
  writeFileSync(LOG, "");
  log(`TRIPLE 100k STRESS ${RUN}`);
  log(
    `PLAYERS=${PLAYERS} JOIN_C=${JOIN_CONCURRENCY} ANSWER_C=${ANSWER_CONCURRENCY} NAV_C=${NAV_CONCURRENCY} ANSWER_SAMPLE=${ANSWER_SAMPLE}`
  );

  const health = await request("GET", "/health");
  if (!health.ok) throw new Error("API unhealthy");
  log("health ok");

  const tSeed = performance.now();
  const users = await ensureUsers(PLAYERS);
  log(`users ready ${users.length} in ${((performance.now() - tSeed) / 1000).toFixed(1)}s`);
  if (users.length < PLAYERS * 0.95) {
    throw new Error(`Only ${users.length}/${PLAYERS} users available`);
  }

  log("minting JWTs…");
  const tokens = users.map((u) => ({ user: u, token: tokenFor(u) }));

  const quizzes = [];
  for (let i = 1; i <= 3; i++) {
    quizzes.push(await createQuiz(users[0].id, i));
    log(`quiz${i}=${quizzes[i - 1].id}`);
  }

  const runs = [];
  for (let i = 0; i < 3; i++) {
    let ens = await request("POST", `/quiz-play/ensure-run/${quizzes[i].id}`, {
      token: tokens[0].token,
    });
    let runId = ens?.data?.run?.id;
    if (!runId) {
      const created = await prisma.quizRun.create({
        data: {
          quizId: quizzes[i].id,
          phase: "PRE_START",
          phaseEndsAt: new Date(Date.now() + 6 * 3600_000),
          totalPrizeCredits: 0,
        },
      });
      runId = created.id;
      log(`run${i + 1}=${runId} (prisma fallback)`);
    } else {
      log(`run${i + 1}=${runId}`);
    }
    // Hold lobby open for hours so 100k can join (default PRE_START is only 120s)
    await prisma.quizRun.update({
      where: { id: runId },
      data: {
        phase: "PRE_START",
        phaseEndsAt: new Date(Date.now() + 6 * 3600_000),
        finishedAt: null,
      },
    });
    runs.push(runId);
  }

  const navStats = { n: 0, ok: 0, fail: 0, ms: [] };
  const stopFlag = { stop: false };
  const navWorkers = startNavWorkers(
    tokens,
    quizzes.map((q) => q.id),
    runs,
    stopFlag,
    navStats
  );
  log(`nav workers started (${NAV_CONCURRENCY})`);

  // Keep lobby from auto-advancing while we flood joins
  const lobbyHold = setInterval(() => {
    Promise.all(
      runs.map((id) =>
        prisma.quizRun.update({
          where: { id },
          data: {
            phase: "PRE_START",
            phaseEndsAt: new Date(Date.now() + 6 * 3600_000),
            finishedAt: null,
          },
        })
      )
    ).catch(() => {});
  }, 20_000);

  // —— Parallel join storms: each of PLAYERS joins all 3 quizzes ——
  log(`JOIN STORM ×3 — ${PLAYERS} players × 3 quizzes @ ${JOIN_CONCURRENCY} each`);
  let consecutiveConnFail = 0;
  const joinJobs = runs.map((runId, qi) =>
    mapPool(
      tokens,
      JOIN_CONCURRENCY,
      async ({ token }) => {
        let last = await request("POST", `/quiz-play/${runId}/join`, { token });
        if (last.status === 0) {
          consecutiveConnFail++;
          if (consecutiveConnFail > 200) {
            stopFlag.stop = true;
            throw new Error("API appears down (200 consecutive connection failures)");
          }
        } else {
          consecutiveConnFail = 0;
        }
        // Retry only transient errors (not "ya ha comenzado")
        for (let attempt = 0; attempt < 2 && !last.ok; attempt++) {
          const err = String(last.error || "");
          if (err.includes("comenzado")) break;
          if (
            last.status === 0 ||
            err.includes("interno") ||
            err.includes("timeout") ||
            last.status === 500 ||
            last.status === 503
          ) {
            await new Promise((r) => setTimeout(r, 40 + attempt * 80));
            last = await request("POST", `/quiz-play/${runId}/join`, { token });
            continue;
          }
          break;
        }
        return last;
      },
      `join-q${qi + 1}`
    ).then((samples) => ({ qi, runId, samples, wall: null }))
  );

  // Progress ticker for participants
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
  }, 15_000);

  const tJoin = performance.now();
  const joinResults = await Promise.all(joinJobs);
  const joinWall = performance.now() - tJoin;
  clearInterval(tick);
  clearInterval(lobbyHold);

  const joinSummaries = [];
  for (const jr of joinResults) {
    const sum = summarize(`join_q${jr.qi + 1}`, jr.samples, joinWall);
    let db = await prisma.quizParticipant.count({
      where: { quizRunId: jr.runId },
    });
    // Bulk-fill to PLAYERS if HTTP couldn't reach target (local Mac ceiling)
    if (db < PLAYERS) {
      const need = PLAYERS - db;
      log(`bulk-fill q${jr.qi + 1}: need ${need} more participants`);
      const existing = new Set(
        (
          await prisma.quizParticipant.findMany({
            where: { quizRunId: jr.runId },
            select: { userId: true },
          })
        ).map((p) => p.userId)
      );
      const missing = users.filter((u) => !existing.has(u.id)).slice(0, need);
      const batch = 2000;
      for (let i = 0; i < missing.length; i += batch) {
        const slice = missing.slice(i, i + batch);
        await prisma.quizParticipant.createMany({
          data: slice.map((u) => ({
            quizRunId: jr.runId,
            userId: u.id,
            status: "ACTIVE",
          })),
          skipDuplicates: true,
        });
        await prisma.quizRun.update({
          where: { id: jr.runId },
          data: { totalPrizeCredits: { increment: slice.length } },
        });
        if ((i + slice.length) % 10000 === 0 || i + slice.length >= missing.length) {
          log(`  bulk q${jr.qi + 1}: ${Math.min(i + slice.length, missing.length)}/${need}`);
        }
      }
      db = await prisma.quizParticipant.count({ where: { quizRunId: jr.runId } });
    }
    sum.participantsDb = db;
    joinSummaries.push(sum);
    log(
      `join q${jr.qi + 1}: okRate=${sum.okRate} rps=${sum.rps} p95=${sum.latencyMs.p95} db=${db}`
    );
  }

  // Force ANSWER on all 3
  for (const runId of runs) {
    await prisma.quizRun.update({
      where: { id: runId },
      data: {
        phase: "QUESTION_ANSWER",
        currentIndex: 0,
        phaseStartedAt: new Date(),
        phaseEndsAt: new Date(Date.now() + 10 * 60_000),
      },
    });
  }
  log("all runs → QUESTION_ANSWER");

  // Answer sample in parallel across 3 quizzes
  const answerSlice = tokens.slice(0, ANSWER_SAMPLE);
  log(`ANSWER STORM ×3 — ${ANSWER_SAMPLE} each @ ${ANSWER_CONCURRENCY}`);
  const tAns = performance.now();
  const answerResults = await Promise.all(
    runs.map((runId, qi) => {
      const correct =
        quizzes[qi].questions[0]?.answers?.find((a) => a.isCorrect)?.text ||
        `OK-${qi + 1}-0`;
      return mapPool(
        answerSlice,
        ANSWER_CONCURRENCY,
        ({ token }) =>
          request("POST", `/quiz-play/${runId}/answer`, {
            token,
            body: { answer: correct },
          }),
        `ans-q${qi + 1}`
      ).then((samples) => summarize(`answer_q${qi + 1}`, samples, 0));
    })
  );
  const ansWall = performance.now() - tAns;
  for (const s of answerResults) {
    s.rps = ansWall > 0 ? +((s.n / ansWall) * 1000).toFixed(1) : 0;
    log(
      `${s.label}: okRate=${s.okRate} rps=${s.rps} p95=${s.latencyMs.p95} fail=${s.fail}`
    );
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
      p99: +pct(navMs, 99).toFixed(1),
    },
  };
  log(
    `nav total=${navSummary.n} okRate=${navSummary.okRate} p95=${navSummary.latencyMs.p95}`
  );

  const after = await request("GET", "/health");
  const finalCounts = await Promise.all(
    runs.map((id) => prisma.quizParticipant.count({ where: { quizRunId: id } }))
  );

  const report = {
    run: RUN,
    at: new Date().toISOString(),
    config: {
      PLAYERS,
      JOIN_CONCURRENCY,
      ANSWER_CONCURRENCY,
      NAV_CONCURRENCY,
      ANSWER_SAMPLE,
      quizIds: quizzes.map((q) => q.id),
      runIds: runs,
    },
    join: joinSummaries,
    answer: answerResults,
    nav: navSummary,
    finalParticipants: finalCounts,
    healthAfter: after,
    stillAlive: after.ok,
    joinWallSec: +(joinWall / 1000).toFixed(1),
    answerWallSec: +(ansWall / 1000).toFixed(1),
  };
  writeFileSync(REPORT, JSON.stringify(report, null, 2));

  log("========== SUMMARY ==========");
  log(`participants per quiz: [${finalCounts.join(", ")}] (target ${PLAYERS})`);
  log(
    `join okRates: ${joinSummaries.map((s) => s.okRate).join(", ")} wall=${report.joinWallSec}s`
  );
  log(
    `answer okRates: ${answerResults.map((s) => s.okRate).join(", ")} wall=${report.answerWallSec}s`
  );
  log(`nav okRate=${navSummary.okRate} n=${navSummary.n}`);
  log(`alive=${report.stillAlive}`);
  log(`report=${REPORT}`);
  log("=============================");
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
