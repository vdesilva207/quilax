#!/usr/bin/env node
/**
 * Local: Postgres 5433 + migrate + API 3001 (keeps PG alive).
 * Usage: node scripts/start-local-services.mjs
 */
import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function waitTcp(port, attempts = 60) {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i < attempts; i++) {
      const ok = await new Promise((res) => {
        const s = createConnection({ host: '127.0.0.1', port }, () => {
          s.end();
          res(true);
        });
        s.on('error', () => res(false));
        s.setTimeout(500, () => {
          s.destroy();
          res(false);
        });
      });
      if (ok) {
        await sleep(400);
        return resolve();
      }
      await sleep(250);
    }
    reject(new Error(`No TCP en ${port}`));
  });
}

function run(cmd, args, env = {}, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    const t = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${cmd} timeout ${timeoutMs}ms`));
    }, timeoutMs);
    child.on('exit', (code) => {
      clearTimeout(t);
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

async function main() {
  fs.mkdirSync(pgDir, { recursive: true });
  const pidFile = path.join(pgDir, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    const stalePid = Number(String(fs.readFileSync(pidFile, 'utf8').split('\n')[0] || '').trim());
    let alive = false;
    if (stalePid > 0) {
      try {
        process.kill(stalePid, 0);
        alive = true;
      } catch {
        alive = false;
      }
    }
    if (!alive) {
      console.log('🧹 stale postmaster.pid');
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

  console.log('🐘 Postgres…');
  if (!fs.existsSync(path.join(pgDir, 'PG_VERSION'))) {
    await pg.initialise();
  }
  await pg.start();
  await waitTcp(PG_PORT);
  try {
    await pg.createDatabase(PG_DB);
  } catch {
    /* exists */
  }

  console.log('📦 migrate…');
  if (process.env.SKIP_MIGRATE === '1') {
    console.log('⏭ SKIP_MIGRATE=1 — skipping');
  } else {
    const prismaBin = path.join(root, 'node_modules', '.bin', 'prisma');
    try {
      await run(prismaBin, ['migrate', 'deploy'], { DATABASE_URL }, 90000);
    } catch (err) {
      console.warn('⚠️ migrate failed/timeout — continuing (DB already up):', err.message);
    }
  }

  console.log('🚀 API :3001');
  const api = spawn('node', ['src/index.js'], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL,
      PORT: '3001',
      NODE_ENV: 'development',
      DEV_LIGHT_WORKERS: 'true',
      DB_POOL_SIZE: '10',
      // Avoid huge heap from .env NODE_OPTIONS on constrained machines
      NODE_OPTIONS: '--max-old-space-size=2048',
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
    console.error('API exited', code);
    await pg.stop().catch(() => {});
    process.exit(code ?? 1);
  });
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
