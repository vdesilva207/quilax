/**
 * ULTRA phase 2 — answer + ranking on already bulk-filled mega runs.
 * Caps concurrency for Postgres max_connections=100.
 *
 *   RUN_IDS=441,442,443,444,445,446 QUIZ_IDS=476,477,478,479,480,481 \
 *   ANSWER_SAMPLE=30000 ANSWER_CONCURRENCY=40 RANK_SAMPLE=100000 \
 *   node scripts/stress-ultra-phase2.mjs
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

const RUN_IDS = (process.env.RUN_IDS || "441,442,443,444,445,446")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter(Boolean);
const QUIZ_IDS = (process.env.QUIZ_IDS || "476,477,478,479,480,481")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter(Boolean);
const ANSWER_SAMPLE = Math.max(1000, Number(process.env.ANSWER_SAMPLE || 30_000));
const RANK_SAMPLE = Math.max(1000, Number(process.env.RANK_SAMPLE || 100_000));
const ANSWER_CONCURRENCY = Math.max(10, Math.min(60, Number(process.env.ANSWER_CONCURRENCY || 40)));
const RANK_CONCURRENCY = Math.max(20, Math.min(250, Number(process.env.RANK_CONCURRENCY || 200)));
const DOMAIN = "quilax.local";
const RUN = `ultra2${Date.now().toString(36)}`;
const __dir = dirname(fileURLToPath(import.meta.url));
const LOG = join(__dir, `stress-ultra-phase2-${RUN}.log`);
const REPORT = join(__dir, `stress-ultra-phase2-report-${RUN}.json`);

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: ANSWER_CONCURRENCY + RANK_CONCURRENCY + 50,
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
            data = null;
          }
          const ok =
            (res.statusCode >= 200 && res.statusCode < 400) ||
            !!data?.joined ||
            !!data?.alreadyJoined ||
            !!data?.allowed ||
            data?.correct != null ||
            data?.me != null ||
            Array.isArray(data?.top);
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
      const k = String(s.error || "err").slice(0, 120);
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

async function holdAnswer(runIds) {
  await Promise.all(
    runIds.map((id) =>
      prisma.quizRun.update({
        where: { id },
        data: {
          phase: "QUESTION_ANSWER",
          currentIndex: 0,
          phaseStartedAt: new Date(),
          phaseEndsAt: new Date(Date.now() + 6 * 3600_000),
          finishedAt: null,
        },
      })
    )
  );
}

async function holdRanking(runIds) {
  await Promise.all(
    runIds.map((id) =>
      prisma.quizRun.update({
        where: { id },
        data: {
          phase: "QUESTION_RANKING",
          phaseEndsAt: new Date(Date.now() + 6 * 3600_000),
          finishedAt: null,
        },
      })
    )
  );
}

async function main() {
  writeFileSync(LOG, "");
  log(`ULTRA PHASE2 ${RUN}`);
  log(
    `runs=[${RUN_IDS}] answer=${ANSWER_SAMPLE}@${ANSWER_CONCURRENCY} rank=${RANK_SAMPLE}@${RANK_CONCURRENCY}`
  );

  let health = await request("GET", "/health");
  for (let i = 0; i < 30 && !health.ok; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    health = await request("GET", "/health");
  }
  if (!health.ok) throw new Error("API unhealthy");
  log("health ok");

  const quizzes = [];
  for (const id of QUIZ_IDS) {
    const q = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: { include: { answers: true }, orderBy: { id: "asc" } },
      },
    });
    if (!q) throw new Error(`quiz ${id} missing`);
    quizzes.push(q);
  }

  const need = Math.max(ANSWER_SAMPLE, RANK_SAMPLE);
  log(`loading ${need} users…`);
  const users = await prisma.user.findMany({
    where: { email: { endsWith: `@${DOMAIN}` }, role: "USER" },
    select: { id: true, email: true, role: true },
    take: need,
    orderBy: { id: "asc" },
  });
  if (users.length < need * 0.9) throw new Error(`users ${users.length}/${need}`);
  log(`minting ${users.length} JWTs…`);
  const tokens = users.map((u) => ({ user: u, token: tokenFor(u) }));

  const hold = setInterval(() => {
    holdAnswer(RUN_IDS).catch(() => {});
  }, 30_000);
  await holdAnswer(RUN_IDS);
  log("phase → QUESTION_ANSWER (held 6h)");

  const answerSlice = tokens.slice(0, ANSWER_SAMPLE);
  const answerResults = [];
  const tAns = performance.now();
  for (let qi = 0; qi < RUN_IDS.length; qi++) {
    const runId = RUN_IDS[qi];
    const correct =
      quizzes[qi].questions[0]?.answers?.find((a) => a.isCorrect)?.text ||
      `OK-${qi + 1}-0`;
    const tQ = performance.now();
    const samples = await mapPool(
      answerSlice,
      ANSWER_CONCURRENCY,
      async ({ token }) => {
        let last = await request("POST", `/quiz-play/${runId}/answer`, {
          token,
          body: { answer: correct },
        });
        if (!last.ok && (last.status === 0 || last.status >= 500)) {
          await new Promise((r) => setTimeout(r, 100));
          last = await request("POST", `/quiz-play/${runId}/answer`, {
            token,
            body: { answer: correct },
          });
        }
        return last;
      },
      `ans-q${qi + 1}`
    );
    const s = summarize(`answer_q${qi + 1}`, samples, performance.now() - tQ);
    answerResults.push(s);
    log(`${s.label}: okRate=${s.okRate} rps=${s.rps} p95=${s.latencyMs.p95} fail=${s.fail}`);
    if (s.topErrors?.length) {
      log(`  errors: ${s.topErrors.map((e) => `${e.error}:${e.count}`).join(" | ")}`);
    }
  }
  const ansWall = performance.now() - tAns;

  clearInterval(hold);
  await holdRanking(RUN_IDS);
  log("phase → QUESTION_RANKING");

  const rankSlice = tokens.slice(0, RANK_SAMPLE);
  const rankResults = [];
  const tRank = performance.now();
  for (let qi = 0; qi < RUN_IDS.length; qi++) {
    const runId = RUN_IDS[qi];
    const tQ = performance.now();
    const samples = await mapPool(
      rankSlice,
      RANK_CONCURRENCY,
      ({ token }) =>
        request("GET", `/quiz-play/${runId}/ranking?limit=5`, { token }),
      `rank-q${qi + 1}`
    );
    const s = summarize(`rank_q${qi + 1}`, samples, performance.now() - tQ);
    rankResults.push(s);
    log(`${s.label}: okRate=${s.okRate} rps=${s.rps} p95=${s.latencyMs.p95} fail=${s.fail}`);
    if (s.topErrors?.length) {
      log(`  errors: ${s.topErrors.map((e) => `${e.error}:${e.count}`).join(" | ")}`);
    }
  }
  const rankWall = performance.now() - tRank;

  const after = await request("GET", "/health");
  const report = {
    run: RUN,
    at: new Date().toISOString(),
    runIds: RUN_IDS,
    quizIds: QUIZ_IDS,
    config: { ANSWER_SAMPLE, ANSWER_CONCURRENCY, RANK_SAMPLE, RANK_CONCURRENCY },
    answer: answerResults,
    ranking: rankResults,
    stillAlive: after.ok,
    answerWallSec: +(ansWall / 1000).toFixed(1),
    rankWallSec: +(rankWall / 1000).toFixed(1),
  };
  writeFileSync(REPORT, JSON.stringify(report, null, 2));

  log("========== PHASE2 SUMMARY ==========");
  log(`answer okRates: ${answerResults.map((s) => s.okRate).join(", ")} (${report.answerWallSec}s)`);
  log(`ranking okRates: ${rankResults.map((s) => s.okRate).join(", ")} (${report.rankWallSec}s)`);
  log(`alive=${report.stillAlive}`);
  log(`report=${REPORT}`);
  log("===================================");
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
