#!/usr/bin/env node
/**
 * Local dev: embedded Postgres + migrations + API on :3001.
 * Usage: node scripts/start-dev-stack.mjs
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import EmbeddedPostgres from 'embedded-postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pgDir = path.join(root, '..', '.local-services', 'embedded-pg-data');

const PG_PORT = 5433;
const PG_USER = 'postgres';
const PG_PASS = 'postgres';
const PG_DB = 'quilax_dev';
const DATABASE_URL = `postgresql://${PG_USER}:${PG_PASS}@127.0.0.1:${PG_PORT}/${PG_DB}?schema=public`;

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Wait until TCP 5433 accepts connections (avoids Prisma P1001 race). */
async function waitForPostgres(port, attempts = 40) {
  const net = await import('node:net');
  for (let i = 0; i < attempts; i++) {
    const ok = await new Promise((resolve) => {
      const s = net.createConnection({ host: '127.0.0.1', port }, () => {
        s.end();
        resolve(true);
      });
      s.on('error', () => resolve(false));
      s.setTimeout(800, () => {
        s.destroy();
        resolve(false);
      });
    });
    if (ok) {
      // Extra settle time after accept
      await sleep(500);
      return;
    }
    await sleep(250);
  }
  throw new Error(`Postgres no responde en 127.0.0.1:${port}`);
}

async function main() {
  fs.mkdirSync(pgDir, { recursive: true });

  // Stale lock after crash → Prisma P1001 / failed start
  const pidFile = path.join(pgDir, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    const first = String(fs.readFileSync(pidFile, 'utf8').split('\n')[0] || '').trim();
    const stalePid = Number(first);
    let alive = false;
    if (Number.isFinite(stalePid) && stalePid > 0) {
      try {
        process.kill(stalePid, 0);
        alive = true;
      } catch {
        alive = false;
      }
    }
    if (!alive) {
      console.log('🧹 Removing stale postmaster.pid');
      fs.unlinkSync(pidFile);
    }
  }

  const pg = new EmbeddedPostgres({
    databaseDir: pgDir,
    user: PG_USER,
    password: PG_PASS,
    port: PG_PORT,
    persistent: true,
  });

  console.log('🐘 Starting embedded Postgres…');
  const alreadyInit = fs.existsSync(path.join(pgDir, 'PG_VERSION'));
  if (!alreadyInit) {
    await pg.initialise();
  }
  await pg.start();
  await waitForPostgres(PG_PORT);

  try {
    await pg.createDatabase(PG_DB);
  } catch {
    /* already exists */
  }

  console.log('📦 Running Prisma migrations…');
  await run('npx', ['prisma', 'migrate', 'deploy'], { DATABASE_URL });

  console.log('🚀 Starting API on http://127.0.0.1:3001');
  const api = spawn('node', ['src/index.js'], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL,
      PORT: '3001',
      NODE_ENV: 'development',
      DEV_LIGHT_WORKERS: 'true',
      // Solo si el usuario lo pide explícitamente (por defecto se envía email real)
      ...(process.env.SKIP_EMAIL ? { SKIP_EMAIL: process.env.SKIP_EMAIL } : {}),
    },
  });

  const shutdown = async () => {
    api.kill('SIGTERM');
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  api.on('exit', async (code) => {
    await pg.stop().catch(() => {});
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error('❌ Dev stack failed:', err);
  process.exit(1);
});
