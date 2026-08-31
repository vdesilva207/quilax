#!/usr/bin/env node
/**
 * Integration smoke for principal ADMIN vs ADMIN_WORKER panel.
 */
import speakeasy from 'speakeasy';
import { PrismaClient } from '@prisma/client';

const API = process.env.API_BASE || 'http://127.0.0.1:3001';
const SECRET = 'SoyPeruana6767.el207';
const PRINCIPAL = { email: 'principal.test@quilax.local', password: 'PrincipalTest2026!' };
const WORKER = { email: 'worker.test@quilax.local', password: 'WorkerTest2026!' };

const results = [];
function ok(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail: String(detail).slice(0, 200) });
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` — ${String(detail).slice(0, 120)}` : ''}`);
}

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { status: res.status, data };
}

async function login(creds) {
  const check = await req('POST', '/admin-auth/check-admin', { body: { email: creds.email } });
  if (!check.data?.isAdmin) throw new Error(`check-admin failed for ${creds.email}`);
  const secret = await req('POST', '/admin-auth/verify-secret', { body: { secretPassword: SECRET } });
  if (!(secret.data?.verified || secret.data?.success)) {
    throw new Error(`secret failed: ${JSON.stringify(secret.data)}`);
  }
  const loginRes = await req('POST', '/admin-auth/login', {
    body: { email: creds.email, password: creds.password },
  });
  if (!loginRes.data?.success) {
    throw new Error(`login failed: ${JSON.stringify(loginRes.data)}`);
  }
  if (loginRes.data.token) {
    return { token: loginRes.data.token, user: { email: creds.email, id: loginRes.data.userId } };
  }
  if (!loginRes.data.requiresTwoFactor) {
    throw new Error(`unexpected login: ${JSON.stringify(loginRes.data)}`);
  }
  const userId = loginRes.data.userId;
  const twoFactorSecret = loginRes.data.manualSecret;
  if (!twoFactorSecret) throw new Error('no manualSecret for 2FA');
  const totp = speakeasy.totp({ secret: twoFactorSecret, encoding: 'base32' });
  const verify = await req('POST', '/admin-auth/verify-2fa', {
    body: { userId, token: totp },
  });
  if (!verify.data?.token) {
    throw new Error(`2fa failed: ${JSON.stringify(verify.data)}`);
  }
  return { token: verify.data.token, user: { email: creds.email, id: userId } };
}

async function seedUserMessage() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({ where: { role: 'USER' }, select: { id: true } });
    if (!user) return null;
    const msg = await prisma.adminMessage.create({
      data: {
        userId: user.id,
        recipientType: 'ADMIN',
        subject: 'E2E user message',
        message: `Smoke inbox ${Date.now()}`,
        status: 'UNREAD',
      },
    });
    return msg.id;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log(`API ${API}\n`);

  let principal;
  let worker;
  try {
    principal = await login(PRINCIPAL);
    ok('Login ADMIN principal', true, `id=${principal.user.id}`);
  } catch (e) {
    ok('Login ADMIN principal', false, e.message);
    console.log('\nAbort: no principal token');
    process.exit(1);
  }
  try {
    worker = await login(WORKER);
    ok('Login ADMIN_WORKER', true, `id=${worker.user.id}`);
  } catch (e) {
    ok('Login ADMIN_WORKER', false, e.message);
    console.log('\nAbort: no worker token');
    process.exit(1);
  }

  const p = principal.token;
  const w = worker.token;

  for (const [label, path] of [
    ['worker blocked /admin/financial/stats', '/admin/financial/stats'],
    ['worker blocked /admin/admins', '/admin/admins'],
  ]) {
    const r = await req('GET', path, { token: w });
    ok(label, r.status === 403, `status=${r.status}`);
  }

  {
    const r = await req('GET', '/admin/admins', { token: p });
    ok(
      'principal GET /admin/admins',
      r.status === 200 && (r.data?.success || Array.isArray(r.data?.admins)),
      `status=${r.status}`
    );
  }

  {
    const g = await req('GET', '/admin/seasons', { token: w });
    ok('worker GET /admin/seasons', g.status === 200, `status=${g.status}`);
    const post = await req('POST', '/admin/seasons', { token: w, body: { name: 'should-fail' } });
    ok('worker blocked POST /admin/seasons', post.status === 403, `status=${post.status}`);
  }

  {
    const r = await req('GET', '/jackpot/history', { token: w });
    ok('worker GET /jackpot/history', r.status === 200, `status=${r.status}`);
  }

  {
    const occupiedP = await req('GET', '/admin/quizzes/occupied-dates?year=2026', { token: p });
    const occupiedW = await req('GET', '/admin/quizzes/occupied-dates?year=2026', { token: w });
    ok('principal occupied-dates', occupiedP.status === 200, `status=${occupiedP.status}`);
    ok('worker occupied-dates', occupiedW.status === 200, `status=${occupiedW.status}`);
  }

  let pending = [];
  {
    const listW = await req('GET', '/admin/quizzes', { token: w });
    pending = Array.isArray(listW.data) ? listW.data : listW.data?.quizzes || [];
    ok(
      'worker GET /admin/quizzes (pending)',
      listW.status === 200,
      `status=${listW.status} count=${pending.length}`
    );
  }

  const quizId = pending[0]?.id || 242;
  {
    const dW = await req('GET', `/admin/quizzes/${quizId}`, { token: w });
    const dP = await req('GET', `/admin/quizzes/${quizId}`, { token: p });
    ok('worker GET quiz detail', dW.status === 200, `id=${quizId} status=${dW.status}`);
    ok('principal GET quiz detail', dP.status === 200, `id=${quizId} status=${dP.status}`);
  }

  {
    const target = pending.find((q) => q.status === 'PENDING_REVIEW') || pending[0];
    if (target?.id) {
      const rej = await req('POST', `/admin/quizzes/${target.id}/reject`, {
        token: w,
        body: { message: 'E2E worker reject — shared state test' },
      });
      ok(
        'worker REJECT quiz',
        rej.status === 200 && (rej.data?.ok || rej.data?.quiz),
        `id=${target.id} http=${rej.status}`
      );
      const afterP = await req('GET', `/admin/quizzes/${target.id}`, { token: p });
      const blob = JSON.stringify(afterP.data || {});
      ok(
        'principal sees shared reject status',
        afterP.status === 200 && blob.includes('REJECTED'),
        `http=${afterP.status}`
      );
      const stillPending = await req('GET', '/admin/quizzes', { token: p });
      const list = Array.isArray(stillPending.data) ? stillPending.data : [];
      ok(
        'rejected quiz gone from pending list',
        !list.some((q) => q.id === target.id),
        `pendingCount=${list.length}`
      );
    } else {
      ok('worker REJECT quiz', false, 'no pending quiz');
      ok('principal sees shared reject status', false, 'skipped');
      ok('rejected quiz gone from pending list', false, 'skipped');
    }
  }

  {
    const broadcast = await req('POST', '/admin/messages/admin', {
      token: p,
      body: { subject: 'E2E broadcast', message: `Broadcast test ${Date.now()}` },
    });
    ok(
      'principal broadcast internal message',
      broadcast.status === 200 && broadcast.data?.success,
      `status=${broadcast.status}`
    );

    const workersList = await req('GET', '/admin/messages/workers', { token: p });
    ok(
      'principal list workers',
      workersList.status === 200 && Array.isArray(workersList.data?.workers),
      `count=${workersList.data?.workers?.length}`
    );

    const workerId = workersList.data?.workers?.find((x) => x.email === WORKER.email)?.id;
    const dm = await req('POST', '/admin/messages/admin', {
      token: p,
      body: {
        subject: 'E2E 1:1',
        message: `DM test ${Date.now()}`,
        recipientId: workerId,
      },
    });
    ok(
      'principal 1:1 internal message',
      dm.status === 200 && dm.data?.success,
      `status=${dm.status} workerId=${workerId}`
    );

    const inboxW = await req('GET', '/admin/messages/admin', { token: w });
    const msgs = inboxW.data?.messages || [];
    ok(
      'worker sees broadcast',
      inboxW.status === 200 && msgs.some((m) => m.subject === 'E2E broadcast'),
      `msgs=${msgs.length}`
    );
    ok(
      'worker sees 1:1',
      inboxW.status === 200 && msgs.some((m) => m.subject === 'E2E 1:1'),
      `msgs=${msgs.length}`
    );

    const blockSend = await req('POST', '/admin/messages/admin', {
      token: w,
      body: { subject: 'nope', message: 'worker cannot send' },
    });
    ok('worker blocked sending internal', blockSend.status === 403, `status=${blockSend.status}`);

    const blockWorkersList = await req('GET', '/admin/messages/workers', { token: w });
    ok('worker blocked list workers', blockWorkersList.status === 403, `status=${blockWorkersList.status}`);
  }

  {
    const seededId = await seedUserMessage();
    ok('seed user inbox message', !!seededId, `id=${seededId}`);
    if (seededId) {
      const replyW = await req('POST', `/admin/messages/inbox/${seededId}/reply`, {
        token: w,
        body: { reply: `E2E reply ${Date.now()}` },
      });
      ok(
        'worker reply user message',
        replyW.status === 200 && replyW.data?.success,
        `status=${replyW.status}`
      );
      const inboxP = await req('GET', '/admin/messages/inbox', { token: p });
      const same = (inboxP.data?.messages || []).find((m) => m.id === seededId);
      ok('principal sees RESPONDED', same?.status === 'RESPONDED', `status=${same?.status}`);
      const again = await req('POST', `/admin/messages/inbox/${seededId}/reply`, {
        token: p,
        body: { reply: 'second should fail' },
      });
      ok('second reply blocked (409)', again.status === 409, `status=${again.status}`);
    }
  }

  {
    const wSecret = await req('POST', '/admin-auth/change-secret', {
      token: w,
      body: { currentSecret: SECRET, newSecret: 'ShouldNotWork999!' },
    });
    ok('worker blocked change-secret', wSecret.status === 403, `status=${wSecret.status}`);
  }

  {
    const fin = await req('GET', '/admin/financial/stats', { token: p });
    ok('principal financial stats', fin.status === 200, `status=${fin.status}`);
  }

  // Frontend reachability
  {
    const adminUi = await fetch('http://127.0.0.1:8083/').then((r) => r.status).catch(() => 0);
    ok('admin UI :8083 reachable', adminUi === 200, `http=${adminUi}`);
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n——— ${results.length - failed.length}/${results.length} passed ———`);
  if (failed.length) {
    console.log('Failures:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
