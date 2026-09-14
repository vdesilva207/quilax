#!/usr/bin/env node
/**
 * Render entrypoint — NEVER block boot on migrations.
 * 1) Best-effort schema patches (IF NOT EXISTS)
 * 2) Best-effort `prisma migrate deploy` (60s cap)
 * 3) Start API in-process (same PID binds PORT for health checks)
 */
import { spawn } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

async function ensureCriticalColumns() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "aiModerationEnabled" BOOLEAN NOT NULL DEFAULT false`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "prizeConfig" JSONB`
    );
    console.log('[render-start] SystemSettings columns OK');
  } catch (err) {
    console.error('[render-start] ensureCriticalColumns:', err?.message || err);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

function runMigrateDeploy(timeoutMs = 60_000) {
  return new Promise((resolve) => {
    console.log('[render-start] prisma migrate deploy…');
    const child = spawn('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit',
      env: process.env,
      shell: false,
    });
    let done = false;
    const finish = (code) => {
      if (done) return;
      done = true;
      resolve(code);
    };
    const timer = setTimeout(() => {
      console.error(`[render-start] migrate deploy timed out after ${timeoutMs}ms — continuing boot`);
      try {
        child.kill('SIGTERM');
      } catch {
        /* ignore */
      }
      finish(124);
    }, timeoutMs);
    child.on('error', (err) => {
      console.error('[render-start] migrate spawn error:', err?.message || err);
      clearTimeout(timer);
      finish(1);
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      console.log(`[render-start] migrate deploy exit=${code}`);
      finish(code ?? 1);
    });
  });
}

async function main() {
  console.log('[render-start] boot', {
    node: process.version,
    commit: process.env.RENDER_GIT_COMMIT || null,
    cwd: process.cwd(),
  });

  await ensureCriticalColumns();
  const migrateCode = await runMigrateDeploy(60_000);
  if (migrateCode !== 0) {
    console.error(
      `[render-start] migrate exited ${migrateCode} — API will still start (columns ensured)`
    );
    // Mark the two new migrations applied if deploy keeps failing on history drift
    await new Promise((resolve) => {
      const child = spawn(
        'npx',
        ['prisma', 'migrate', 'resolve', '--applied', '20260910010000_add_ai_moderation_flag'],
        { stdio: 'inherit', env: process.env }
      );
      child.on('exit', () => resolve());
      child.on('error', () => resolve());
      setTimeout(() => {
        try {
          child.kill('SIGTERM');
        } catch {
          /* ignore */
        }
        resolve();
      }, 15_000);
    });
    await new Promise((resolve) => {
      const child = spawn(
        'npx',
        [
          'prisma',
          'migrate',
          'resolve',
          '--applied',
          '20260914160000_add_system_settings_prize_config',
        ],
        { stdio: 'inherit', env: process.env }
      );
      child.on('exit', () => resolve());
      child.on('error', () => resolve());
      setTimeout(() => {
        try {
          child.kill('SIGTERM');
        } catch {
          /* ignore */
        }
        resolve();
      }, 15_000);
    });
    await ensureCriticalColumns();
  }

  console.log('[render-start] starting API…');
  await import('../src/index.js');
}

main().catch((err) => {
  console.error('[render-start] fatal:', err);
  process.exit(1);
});
