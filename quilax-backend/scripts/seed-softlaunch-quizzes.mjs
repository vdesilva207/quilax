#!/usr/bin/env node
/**
 * Non-destructive soft-launch quiz seed (CLI).
 *
 * Usage:
 *   DATABASE_URL='postgresql://…' node scripts/seed-softlaunch-quizzes.mjs
 *   DATABASE_URL='…' SEED_EMAIL=you@email.com FORCE=1 node scripts/seed-softlaunch-quizzes.mjs
 *
 * Skips if PUBLISHED quizzes already exist unless FORCE=1.
 */
import { seedSoftlaunchQuizzes } from '../src/services/softlaunchSeedService.js';
import prisma from '../src/lib/prisma.js';

const force = process.env.FORCE === '1' || process.env.FORCE === 'true';

try {
  const result = await seedSoftlaunchQuizzes({ force });
  console.log(JSON.stringify(result, null, 2));
  if (result.skipped) process.exitCode = 0;
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect().catch(() => {});
}
