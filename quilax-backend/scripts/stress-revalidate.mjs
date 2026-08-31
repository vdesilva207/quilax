/**
 * Sweet-spot revalidation after PG max_connections=300 + DB_POOL_SIZE=50.
 * Reuses loadtest users. Sequential quizzes. Phase holds against scheduler.
 * (Prod uses RDS Proxy + Aurora reader via prismaRead — not local PgBouncer.)
 *
 *   node scripts/stress-revalidate.mjs
 *   JOIN_N=20000 ANSWER_N=20000 RANK_N=50000 JOIN_C=180 ANSWER_C=80 RANK_C=250 QUIZZES=2 node scripts/stress-revalidate.mjs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import http from "node:http";
import { performance } from "node:perf_hooks";
import { writeFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET missing");

const QUIZZES = Math.max(1, Math.min(4, Number(process.env.QUIZZES || 2)));
const JOIN_N = Math.max(500, Number(process.env.JOIN_N || 20_000));
const ANSWER_N = Math.max(500, Number(process.env.ANSWER_N || 20_000));
const RANK_N = Math.max(500, Number(process.env.RANK_N || 50_000));
const JOIN_C = Math.max(20, Number(process.env.JOIN_C || 180));
const ANSWER_C = Math.max(10, Number(process.env.ANSWER_C || 80));
const RANK_C = Math.max(20, Number(process.env.RANK_C || 250));
const DOMAIN = "quilax.local";
const RUN = `rev${Date.now().toString(36)}`;
const __dir = dirname(fileURLToPath(import.meta.url));
const LOG = join(__dir, `stress-revalidate-${RUN}.log`);
const REPORT = join(__dir, `stress-revalidate-report-${RUN}.json`);

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: Math.max(JOIN_C, ANSWER_C, RANK_C) + 80,
});

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  appendFileSync(LOG, line + "\n");
}

function tokenFor(u) {
  return jwt.sign({ id: u.id, role: u.role || "USER" }, JWT_SECRET, {
    expiresIn: "8h",
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
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        let text = "";
        res.on("data", (c) => (text += c));
        res.on("end", () => {
          let data = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch {
            /* ignore */
          }
          const ok =
            (res.statusCode >= 200 && res.statusCode < 400) ||
            !!data?.joined ||
            !!data?.alreadyJoined ||
            data?.correct != null ||
            data?.me != null ||
            Array.isArray(data?.top);
          resolve({
            ok,
            status: res.statusCode,
            ms: performance.now() - started,
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
    },
    topErrors: Object.entries(errors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, count]) => ({ error, count })),
  };
}

async function mapPool(items, concurrency, fn, label) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  const t0 = performance.now();
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
      done++;
      if (done % 5000 === 0 || done === items.length) {
        const elapsed = (performance.now() - t0) / 1000;
        process.stdout.write(
          `\r  ${label} ${done}/${items.length} (${(done / Math.max(elapsed, 0.001)).toFixed(0)} rps)   `
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

async function createQuiz(creatorId, idx) {
  return prisma.quiz.create({
    data: {
      title: `[REV-${idx}] ${RUN}`,
      status: "APPROVED",
      creatorId,
      category: "Cultura",
      language: "es",
      description: `revalidate ${idx}`,
      questions: {
        create: Array.from({ length: 3 }, (_, i) => ({
          text: `REV Q${idx}-${i} ${RUN}`,
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

async function hold(runIds, phase) {
  const data =
    phase === "PRE_START"
      ? {
          phase: "PRE_START",
          phaseEndsAt: new Date(Date.now() + 6 * 3600_000),
          finishedAt: null,
        }
      : phase === "QUESTION_ANSWER"
        ? {
            phase: "QUESTION_ANSWER",
            currentIndex: 0,
            phaseStartedAt: new Date(),
            phaseEndsAt: new Date(Date.now() + 6 * 3600_000),
            finishedAt: null,
          }
        : {
            phase: "QUESTION_RANKING",
            phaseEndsAt: new Date(Date.now() + 6 * 3600_000),
            finishedAt: null,
          };
  await Promise.all(
    runIds.map((id) => prisma.quizRun.update({ where: { id }, data }))
  );
}

async function main() {
  writeFileSync(LOG, "");
  log(`REVALIDATE ${RUN}`);
  log(
    `Q=${QUIZZES} JOIN=${JOIN_N}@${JOIN_C} ANS=${ANSWER_N}@${ANSWER_C} RANK=${RANK_N}@${RANK_C} pool=${process.env.DB_POOL_SIZE || "?"}`
  );

  let health = await request("GET", "/health");
  for (let i = 0; i < 20 && !health.ok; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    health = await request("GET", "/health");
  }
  if (!health.ok) throw new Error("API unhealthy");
  log("health ok");

  const need = Math.max(JOIN_N, ANSWER_N, RANK_N);
  const users = await prisma.user.findMany({
    where: { email: { endsWith: `@${DOMAIN}` }, role: "USER" },
    select: { id: true, role: true },
    take: need,
    orderBy: { id: "asc" },
  });
  if (users.length < need * 0.9) throw new Error(`users ${users.length}/${need}`);
  log(`users ${users.length}; minting JWTs…`);
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
          phaseEndsAt: new Date(Date.now() + 6 * 3600_000),
          totalPrizeCredits: 0,
        },
      });
      runId = created.id;
    }
    await hold([runId], "PRE_START");
    runs.push(runId);
    log(`run${i + 1}=${runId}`);
  }

  const lobbyHold = setInterval(() => hold(runs, "PRE_START").catch(() => {}), 20_000);

  const joinSlice = tokens.slice(0, JOIN_N);
  const joinSummaries = [];
  for (let qi = 0; qi < runs.length; qi++) {
    const runId = runs[qi];
    const t0 = performance.now();
    const samples = await mapPool(
      joinSlice,
      JOIN_C,
      async ({ token }) => {
        let r = await request("POST", `/quiz-play/${runId}/join`, { token });
        if (!r.ok && (r.status === 0 || r.status >= 500)) {
          await new Promise((x) => setTimeout(x, 80));
          r = await request("POST", `/quiz-play/${runId}/join`, { token });
        }
        return r;
      },
      `join-q${qi + 1}`
    );
    const s = summarize(`join_q${qi + 1}`, samples, performance.now() - t0);
    joinSummaries.push(s);
    log(
      `${s.label}: okRate=${s.okRate} rps=${s.rps} p95=${s.latencyMs.p95} fail=${s.fail}`
    );
    if (s.topErrors?.length) {
      log(`  errors: ${s.topErrors.map((e) => `${e.error}:${e.count}`).join(" | ")}`);
    }
  }
  clearInterval(lobbyHold);

  const answerHold = setInterval(
    () => hold(runs, "QUESTION_ANSWER").catch(() => {}),
    20_000
  );
  await hold(runs, "QUESTION_ANSWER");
  log("phase → QUESTION_ANSWER");

  const answerSlice = tokens.slice(0, ANSWER_N);
  const answerSummaries = [];
  for (let qi = 0; qi < runs.length; qi++) {
    const runId = runs[qi];
    const correct =
      quizzes[qi].questions[0]?.answers?.find((a) => a.isCorrect)?.text ||
      `OK-${qi + 1}-0`;
    const t0 = performance.now();
    const samples = await mapPool(
      answerSlice,
      ANSWER_C,
      ({ token }) =>
        request("POST", `/quiz-play/${runId}/answer`, {
          token,
          body: { answer: correct },
        }),
      `ans-q${qi + 1}`
    );
    const s = summarize(`answer_q${qi + 1}`, samples, performance.now() - t0);
    answerSummaries.push(s);
    log(
      `${s.label}: okRate=${s.okRate} rps=${s.rps} p95=${s.latencyMs.p95} fail=${s.fail}`
    );
    if (s.topErrors?.length) {
      log(`  errors: ${s.topErrors.map((e) => `${e.error}:${e.count}`).join(" | ")}`);
    }
  }
  clearInterval(answerHold);

  await hold(runs, "QUESTION_RANKING");
  log("phase → QUESTION_RANKING");
  const rankSlice = tokens.slice(0, RANK_N);
  const rankSummaries = [];
  for (let qi = 0; qi < runs.length; qi++) {
    const runId = runs[qi];
    const t0 = performance.now();
    const samples = await mapPool(
      rankSlice,
      RANK_C,
      ({ token }) =>
        request("GET", `/quiz-play/${runId}/ranking?limit=5`, { token }),
      `rank-q${qi + 1}`
    );
    const s = summarize(`rank_q${qi + 1}`, samples, performance.now() - t0);
    rankSummaries.push(s);
    log(
      `${s.label}: okRate=${s.okRate} rps=${s.rps} p95=${s.latencyMs.p95} fail=${s.fail}`
    );
  }

  const after = await request("GET", "/health");
  const report = {
    run: RUN,
    at: new Date().toISOString(),
    config: {
      QUIZZES,
      JOIN_N,
      JOIN_C,
      ANSWER_N,
      ANSWER_C,
      RANK_N,
      RANK_C,
      DB_POOL_SIZE: process.env.DB_POOL_SIZE || null,
      runIds: runs,
    },
    join: joinSummaries,
    answer: answerSummaries,
    ranking: rankSummaries,
    stillAlive: after.ok,
  };
  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  log("========== REVALIDATE SUMMARY ==========");
  log(`join: ${joinSummaries.map((s) => s.okRate).join(", ")}`);
  log(`answer: ${answerSummaries.map((s) => s.okRate).join(", ")}`);
  log(`rank: ${rankSummaries.map((s) => s.okRate).join(", ")}`);
  log(`alive=${after.ok} report=${REPORT}`);
  log("=======================================");
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
