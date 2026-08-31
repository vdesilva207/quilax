/**
 * Stress test REAL de Quilax: seed masivo + join storm + answers + reads.
 *
 * Límites locales (Mac): no caben 1M TCP simultáneas.
 * Este harness empuja miles–decenas de miles de HTTP concurrentes reales
 * contra join/answer/reads midiendo p50/p95/p99, errores y RPS.
 *
 * Uso:
 *   node scripts/stress-massive.mjs
 *   USERS=25000 JOINERS=15000 CONCURRENCY=800 ANSWERS=8000 node scripts/stress-massive.mjs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import http from "node:http";
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const prisma = new PrismaClient();
const API = process.env.API_URL || "http://127.0.0.1:3001";
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET missing — load .env");

const TARGET_USERS = Math.max(1000, Number(process.env.USERS || 25_000));
const JOINERS = Math.max(100, Number(process.env.JOINERS || 15_000));
const ANSWER_N = Math.max(100, Number(process.env.ANSWERS || 8_000));
const CONCURRENCY = Math.max(50, Number(process.env.CONCURRENCY || 800));
const READ_DURATION_MS = Math.max(5_000, Number(process.env.READ_MS || 45_000));
const PASSWORD = "LoadTest2026!";
const DOMAIN = "quilax.local";
const PREFIX = "loadtest";
const RUN = `stress${Date.now().toString(36)}`;
const __dir = dirname(fileURLToPath(import.meta.url));

const agent = new http.Agent({ keepAlive: true, maxSockets: CONCURRENCY * 2 });

function tokenFor(user) {
  return jwt.sign({ id: user.id, role: user.role || "USER" }, JWT_SECRET, {
    expiresIn: "2h",
  });
}

function request(method, path, { token, body, timeoutMs = 20_000 } = {}) {
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
          "user-agent": `quilax-stress/${RUN}`,
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
          const text = Buffer.concat(chunks).toString("utf8");
          let data = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch {
            data = { raw: text.slice(0, 120) };
          }
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 400,
            status: res.statusCode,
            ms: performance.now() - started,
            data,
            error: res.statusCode >= 400 ? data?.error || `status_${res.statusCode}` : null,
          });
        });
      }
    );
    req.on("error", (err) => {
      resolve({
        ok: false,
        status: 0,
        ms: performance.now() - started,
        error: err.code || err.message,
      });
    });
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
  const byStatus = {};
  for (const s of samples) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    if (!s.ok) {
      const k = String(s.error || `status_${s.status}`).slice(0, 80);
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
    byStatus,
    topErrors: Object.entries(errors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([error, count]) => ({ error, count })),
  };
}

async function mapPool(items, concurrency, fn, onProgress) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
      done++;
      if (onProgress && done % 500 === 0) onProgress(done, items.length);
    }
  }
  const n = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

async function ensureUsers(target) {
  const existing = await prisma.user.count({
    where: { email: { endsWith: `@${DOMAIN}` }, role: "USER" },
  });
  console.log(`👥 loadtest users existing: ${existing}, target: ${target}`);
  if (existing >= target) {
    await prisma.user.updateMany({
      where: { email: { endsWith: `@${DOMAIN}` }, role: "USER", balance: { lt: 30 } },
      data: { balance: 100, isOver18: true, emailVerified: true, idVerified: true },
    });
    return prisma.user.findMany({
      where: { email: { endsWith: `@${DOMAIN}` }, role: "USER" },
      select: { id: true, email: true, role: true },
      take: target,
      orderBy: { id: "asc" },
    });
  }

  const hash = await bcrypt.hash(PASSWORD, 4);
  const need = target - existing;
  const start = existing + 1;
  const batchSize = 1000;
  for (let offset = 0; offset < need; offset += batchSize) {
    const n = Math.min(batchSize, need - offset);
    const data = [];
    for (let j = 0; j < n; j++) {
      const i = start + offset + j;
      data.push({
        email: `${PREFIX}${i}@${DOMAIN}`,
        username: `Load${i}_${RUN.slice(-4)}`,
        password: hash,
        role: "USER",
        balance: 100,
        currency: "EUR",
        country: "ES",
        emailVerified: true,
        isOver18: true,
        idVerified: true,
        fullName: `Load Test ${i}`,
      });
    }
    try {
      await prisma.user.createMany({ data, skipDuplicates: true });
    } catch (e) {
      // fallback one-by-one on username collisions
      for (const row of data) {
        try {
          await prisma.user.create({ data: row });
        } catch {
          /* skip */
        }
      }
    }
    process.stdout.write(`\r  seeded +${Math.min(offset + n, need)}/${need}`);
  }
  process.stdout.write("\n");

  await prisma.user.updateMany({
    where: { email: { endsWith: `@${DOMAIN}` }, role: "USER" },
    data: { balance: 100, isOver18: true, emailVerified: true },
  });

  return prisma.user.findMany({
    where: { email: { endsWith: `@${DOMAIN}` }, role: "USER" },
    select: { id: true, email: true, role: true },
    take: target,
    orderBy: { id: "asc" },
  });
}

async function createPlayableQuiz(creatorId) {
  return prisma.quiz.create({
    data: {
      title: `[STRESS] ${RUN}`,
      status: "APPROVED",
      creatorId,
      category: "Cultura",
      language: "es",
      description: "Quiz de stress test masivo",
      questions: {
        create: Array.from({ length: 5 }, (_, i) => ({
          text: `Stress Q${i + 1} ${RUN}`,
          maxPoints: 1000,
          readTime: 2,
          answerTime: 15,
          answers: {
            create: [
              { text: `OK-${i}`, isCorrect: true },
              { text: `NO-${i}-a`, isCorrect: false },
              { text: `NO-${i}-b`, isCorrect: false },
              { text: `NO-${i}-c`, isCorrect: false },
            ],
          },
        })),
      },
    },
    include: { questions: { include: { answers: true }, orderBy: { id: "asc" } } },
  });
}

async function main() {
  console.log(`\n🔥 Quilax MASSIVE STRESS — ${RUN}`);
  console.log(
    `API=${API} users=${TARGET_USERS} joiners=${JOINERS} answers=${ANSWER_N} concurrency=${CONCURRENCY}\n`
  );

  const health = await request("GET", "/health");
  if (!health.ok) throw new Error(`API unhealthy: ${JSON.stringify(health)}`);
  console.log("✅ health ok");

  const tSeed = performance.now();
  const users = await ensureUsers(TARGET_USERS);
  console.log(`✅ users ready: ${users.length} in ${((performance.now() - tSeed) / 1000).toFixed(1)}s`);

  const tokens = users.map((u) => ({ user: u, token: tokenFor(u) }));
  const quiz = await createPlayableQuiz(users[0].id);
  console.log(`✅ quiz ${quiz.id} APPROVED`);

  const ensure = await request("POST", `/quiz-play/ensure-run/${quiz.id}`, {
    token: tokens[0].token,
  });
  if (!ensure.ok || !ensure.data?.run?.id) {
    throw new Error(`ensure-run failed: ${JSON.stringify(ensure)}`);
  }
  const runId = ensure.data.run.id;
  console.log(`✅ run ${runId} phase=${ensure.data.run.phase}`);

  const report = {
    run: RUN,
    at: new Date().toISOString(),
    config: { TARGET_USERS, JOINERS, ANSWER_N, CONCURRENCY, READ_DURATION_MS, quizId: quiz.id, runId },
    phases: {},
  };

  // —— JOIN STORM ——
  const joinSlice = tokens.slice(0, Math.min(JOINERS, tokens.length));
  console.log(`\n🌊 JOIN STORM — ${joinSlice.length} joins @ concurrency ${CONCURRENCY}`);
  const tJoin = performance.now();
  const joinSamples = await mapPool(
    joinSlice,
    CONCURRENCY,
    async ({ token }) => {
      const r = await request("POST", `/quiz-play/${runId}/join`, { token });
      // alreadyJoined also counts as success for capacity
      if (!r.ok && r.data?.joined) return { ...r, ok: true };
      return r;
    },
    (done, total) => process.stdout.write(`\r  joins ${done}/${total}`)
  );
  process.stdout.write("\n");
  const joinWall = performance.now() - tJoin;
  report.phases.join = summarize("join_storm", joinSamples, joinWall);
  console.log(
    `  → okRate=${report.phases.join.okRate} rps=${report.phases.join.rps} p95=${report.phases.join.latencyMs.p95}ms fail=${report.phases.join.fail}`
  );
  if (report.phases.join.topErrors[0]) {
    console.log(`  → topError: ${report.phases.join.topErrors[0].error} x${report.phases.join.topErrors[0].count}`);
  }

  const participants = await prisma.quizParticipant.count({ where: { quizRunId: runId } });
  const runState = await prisma.quizRun.findUnique({
    where: { id: runId },
    select: { totalPrizeCredits: true, phase: true },
  });
  report.phases.join.participantsDb = participants;
  report.phases.join.prizePool = runState?.totalPrizeCredits;
  console.log(`  → DB participants=${participants} pool=${runState?.totalPrizeCredits}`);

  // —— Force ANSWER phase ——
  await prisma.quizRun.update({
    where: { id: runId },
    data: {
      phase: "QUESTION_ANSWER",
      currentIndex: 0,
      phaseStartedAt: new Date(),
      phaseEndsAt: new Date(Date.now() + 5 * 60_000),
    },
  });
  // best-effort redis phase sync is internal; API reads DB for this route

  const correct =
    quiz.questions[0]?.answers?.find((a) => a.isCorrect)?.text || "OK-0";

  // —— ANSWER STORM ——
  const answerSlice = joinSlice.slice(0, Math.min(ANSWER_N, joinSlice.length));
  console.log(`\n✍️  ANSWER STORM — ${answerSlice.length} answers @ concurrency ${CONCURRENCY}`);
  const tAns = performance.now();
  const answerSamples = await mapPool(
    answerSlice,
    CONCURRENCY,
    async ({ token }) =>
      request("POST", `/quiz-play/${runId}/answer`, {
        token,
        body: { answer: correct },
      }),
    (done, total) => process.stdout.write(`\r  answers ${done}/${total}`)
  );
  process.stdout.write("\n");
  const ansWall = performance.now() - tAns;
  report.phases.answer = summarize("answer_storm", answerSamples, ansWall);
  console.log(
    `  → okRate=${report.phases.answer.okRate} rps=${report.phases.answer.rps} p95=${report.phases.answer.latencyMs.p95}ms fail=${report.phases.answer.fail}`
  );
  if (report.phases.answer.topErrors[0]) {
    console.log(
      `  → topError: ${report.phases.answer.topErrors[0].error} x${report.phases.answer.topErrors[0].count}`
    );
  }

  // —— READ STORM (sustained) ——
  console.log(
    `\n📖 READ STORM — ${READ_DURATION_MS / 1000}s @ concurrency ${CONCURRENCY}`
  );
  const readPaths = [
    () => request("GET", "/health"),
    () => request("GET", `/quiz-info/${quiz.id}`),
    () => request("GET", "/rankings/top?limit=20"),
    () => request("GET", `/quiz-play/${runId}/state`, { token: tokens[0].token }),
    () => request("GET", `/quiz-play/${runId}/ranking`, { token: tokens[1]?.token || tokens[0].token }),
  ];
  const readSamples = [];
  const readEnd = Date.now() + READ_DURATION_MS;
  let inflight = 0;
  const tRead = performance.now();
  await new Promise((resolve) => {
    const launch = () => {
      while (inflight < CONCURRENCY && Date.now() < readEnd) {
        inflight++;
        const fn = readPaths[Math.floor(Math.random() * readPaths.length)];
        fn().then((r) => {
          readSamples.push(r);
          inflight--;
          if (Date.now() >= readEnd && inflight === 0) resolve();
          else if (Date.now() < readEnd) launch();
        });
      }
      if (Date.now() >= readEnd && inflight === 0) resolve();
    };
    launch();
    const pump = setInterval(() => {
      if (Date.now() >= readEnd) {
        clearInterval(pump);
        if (inflight === 0) resolve();
      } else launch();
    }, 25);
  });
  const readWall = performance.now() - tRead;
  report.phases.read = summarize("read_storm", readSamples, readWall);
  console.log(
    `  → okRate=${report.phases.read.okRate} rps=${report.phases.read.rps} p95=${report.phases.read.latencyMs.p95}ms n=${report.phases.read.n}`
  );

  // —— Mixed login/auth burst (smaller) ——
  console.log(`\n🔐 LOGIN BURST — 2000 logins @ concurrency ${Math.min(200, CONCURRENCY)}`);
  const loginUsers = users.slice(0, 2000);
  const tLogin = performance.now();
  const loginSamples = await mapPool(
    loginUsers,
    Math.min(200, CONCURRENCY),
    async (u) =>
      request("POST", "/auth/login", {
        body: { email: u.email, password: PASSWORD },
      }),
    (done, total) => process.stdout.write(`\r  logins ${done}/${total}`)
  );
  process.stdout.write("\n");
  report.phases.login = summarize("login_burst", loginSamples, performance.now() - tLogin);
  console.log(
    `  → okRate=${report.phases.login.okRate} rps=${report.phases.login.rps} p95=${report.phases.login.latencyMs.p95}ms`
  );

  // Health after stress
  const after = await request("GET", "/health");
  report.healthAfter = after;
  report.stillAlive = after.ok;

  const out = join(__dir, `stress-report-${RUN}.json`);
  writeFileSync(out, JSON.stringify(report, null, 2));

  console.log("\n==============================");
  console.log(`JOIN   ok=${report.phases.join.okRate} rps=${report.phases.join.rps} p95=${report.phases.join.latencyMs.p95} participants=${participants}`);
  console.log(`ANSWER ok=${report.phases.answer.okRate} rps=${report.phases.answer.rps} p95=${report.phases.answer.latencyMs.p95}`);
  console.log(`READ   ok=${report.phases.read.okRate} rps=${report.phases.read.rps} p95=${report.phases.read.latencyMs.p95}`);
  console.log(`LOGIN  ok=${report.phases.login.okRate} rps=${report.phases.login.rps} p95=${report.phases.login.latencyMs.p95}`);
  console.log(`Alive after stress: ${report.stillAlive}`);
  console.log(`Report: ${out}`);
  console.log("==============================\n");

  return report;
}

main()
  .catch((e) => {
    console.error("FATAL", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    agent.destroy();
  });
