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

async function main() {
  fs.mkdirSync(pgDir, { recursive: true });

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
