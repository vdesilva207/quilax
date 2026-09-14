/**
 * Ensure principal admin quilax@appquilax.com exists (local + reusable).
 * Usage: DATABASE_URL=... node scripts/ensure-principal-admin.mjs
 */
import bcrypt from 'bcrypt';
import prisma from '../src/lib/prisma.js';

const email = (process.env.SEED_ADMIN_EMAIL || 'quilax@appquilax.com').trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || 'Admin1234!';
const secretPanel = process.env.ADMIN_PANEL_SECRET || 'SoyPeruana6767.el207';

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'ADMIN',
      password: passwordHash,
      adminPassword: passwordHash,
      isBanned: false,
      isOver18: true,
      idVerified: true,
      fullName: 'Quilax Admin',
      username: 'quilax',
    },
    create: {
      email,
      password: passwordHash,
      adminPassword: passwordHash,
      role: 'ADMIN',
      fullName: 'Quilax Admin',
      username: 'quilax',
      balance: 0,
      isOver18: true,
      idVerified: true,
    },
  });

  const existingAccess = await prisma.adminAccess.findFirst();
  if (!existingAccess) {
    await prisma.adminAccess.create({
      data: {
        secretPassword: await bcrypt.hash(secretPanel, 10),
        createdBy: user.id,
      },
    });
  }

  console.log(
    JSON.stringify({
      ok: true,
      email: user.email,
      id: user.id,
      role: user.role,
      personalPasswordHint: 'SEED_ADMIN_PASSWORD or default Admin1234!',
      panelSecret: existingAccess ? 'unchanged (already in DB)' : 'created from ADMIN_PANEL_SECRET/default',
    })
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
