#!/usr/bin/env node
/** Keep embedded Postgres on :5433 alive. */
import { createConnection } from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import EmbeddedPostgres from 'embedded-postgres';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pgDir = path.join(root, '..', '.local-services', 'embedded-pg-data');
const PORT = 5433;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitTcp(port) {
  for (let i = 0; i < 80; i++) {
    const ok = await new Promise((res) => {
      const s = createConnection({ host: '127.0.0.1', port }, () => {
        s.end();
        res(true);
      });
      s.on('error', () => res(false));
      s.setTimeout(400, () => {
        s.destroy();
        res(false);
      });
    });
    if (ok) return;
    await sleep(200);
  }
  throw new Error('Postgres TCP timeout');
}

fs.mkdirSync(pgDir, { recursive: true });
const pidFile = path.join(pgDir, 'postmaster.pid');
if (fs.existsSync(pidFile)) {
  const n = Number(String(fs.readFileSync(pidFile, 'utf8').split('\n')[0] || '').trim());
  let alive = false;
  try {
    if (n > 0) {
      process.kill(n, 0);
      alive = true;
    }
  } catch {
    alive = false;
  }
  if (!alive) fs.unlinkSync(pidFile);
}

const pg = new EmbeddedPostgres({
  databaseDir: pgDir,
  user: 'postgres',
  password: 'postgres',
  port: PORT,
  persistent: true,
});

if (!fs.existsSync(path.join(pgDir, 'PG_VERSION'))) await pg.initialise();
console.log('🐘 starting postgres', PORT);
await pg.start();
await waitTcp(PORT);
try {
  await pg.createDatabase('quilax_dev');
} catch {
  /* exists */
}
console.log('✅ postgres ready on', PORT);

const stop = async () => {
  await pg.stop().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

// Keep alive
setInterval(() => {}, 1 << 30);
