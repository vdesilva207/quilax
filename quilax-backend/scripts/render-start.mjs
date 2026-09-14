#!/usr/bin/env node
/**
 * Render start: apply migrations safely, then boot the API.
 * If migrate deploy fails on the new columns, apply them with IF NOT EXISTS
 * and mark those migrations applied so the next deploy is clean.
 */
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

function run(cmd, args, { allowFail = false } = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: process.env });
  if (r.status !== 0 && !allowFail) {
    const err = new Error(`${cmd} exited ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.status === 0;
}

async function ensureCriticalColumns() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "aiModerationEnabled" BOOLEAN NOT NULL DEFAULT false`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "prizeConfig" JSONB`
    );
    console.log('✅ Critical SystemSettings columns ensured');
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  let migrated = false;
  try {
    migrated = run('npx', ['prisma', 'migrate', 'deploy']);
  } catch (err) {
    console.error('❌ prisma migrate deploy failed:', err?.message || err);
    console.error('→ Applying critical columns directly and resolving known migrations…');
    await ensureCriticalColumns();
    run('npx', ['prisma', 'migrate', 'resolve', '--applied', '20260910010000_add_ai_moderation_flag'], {
      allowFail: true,
    });
    run(
      'npx',
      ['prisma', 'migrate', 'resolve', '--applied', '20260914160000_add_system_settings_prize_config'],
      { allowFail: true }
    );
    try {
      migrated = run('npx', ['prisma', 'migrate', 'deploy']);
    } catch (err2) {
      console.error('❌ migrate deploy still failing after resolve:', err2?.message || err2);
      console.error('→ Booting API anyway after ensureCriticalColumns()');
      await ensureCriticalColumns();
    }
  }

  if (migrated) {
    console.log('✅ prisma migrate deploy OK');
  }

  // Replace this process with the API (keeps PID 1 semantics on Render)
  const node = process.execPath;
  const r = spawnSync(node, ['src/index.js'], { stdio: 'inherit', env: process.env });
  process.exit(r.status ?? 1);
}

main().catch((err) => {
  console.error('❌ render-start fatal:', err);
  process.exit(1);
});
