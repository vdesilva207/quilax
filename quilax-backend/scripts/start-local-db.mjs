#!/usr/bin/env node
/**
 * Local Postgres via embedded-postgres (no Homebrew/Docker required).
 * Usage: node scripts/start-local-db.mjs
 */
import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataDir = path.join(root, '.local-db');

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'quilax',
  password: 'quilax',
  port: 5432,
  persistent: true,
});

async function main() {
  const fs = await import('fs');
  const pgVersion = path.join(dataDir, 'PG_VERSION');
  const alreadyInit = fs.existsSync(pgVersion);

  if (!alreadyInit) {
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase('quilax_dev');
  } catch {
    // already exists
  }
  const url = 'postgresql://quilax:quilax@127.0.0.1:5432/quilax_dev';
  console.log(`LOCAL_DATABASE_URL=${url}`);
  console.log('Postgres local listo en :5432 (Ctrl+C para parar)');

  const shutdown = async () => {
    try {
      await pg.stop();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('❌ start-local-db:', err);
  process.exit(1);
});
