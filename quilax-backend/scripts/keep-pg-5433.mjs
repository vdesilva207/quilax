#!/usr/bin/env node
/**
 * Keep embedded Postgres alive on :5433 (data in .local-services/embedded-pg-data).
 */
import EmbeddedPostgres from 'embedded-postgres';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pgDir = path.join(root, '.local-services', 'embedded-pg-data');

const pidFile = path.join(pgDir, 'postmaster.pid');
if (fs.existsSync(pidFile)) {
  const stalePid = Number(String(fs.readFileSync(pidFile, 'utf8').split('\n')[0] || '').trim());
  let alive = false;
  try {
    if (stalePid > 0) {
      process.kill(stalePid, 0);
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
  port: 5433,
  persistent: true,
});

if (!fs.existsSync(path.join(pgDir, 'PG_VERSION'))) {
  await pg.initialise();
}
await pg.start();
console.log('PG_UP postgresql://postgres:postgres@127.0.0.1:5433/quilax_dev');

const shutdown = async () => {
  try {
    await pg.stop();
  } finally {
    process.exit(0);
  }
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await new Promise(() => {});
