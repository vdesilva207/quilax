import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@appquilax.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin1234!";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: passwordHash,
      adminPassword: passwordHash,
      role: "ADMIN",
      fullName: "Admin Quilax",
      username: "admin",
      balance: 0,
      isOver18: true,
      idVerified: true,
    },
  });

  const now = new Date();
  const existingSeason = await prisma.season.findFirst({
    where: { endsAt: { gt: now } },
  });

  if (!existingSeason) {
    await prisma.season.create({
      data: {
        name: `Temporada ${now.getFullYear()}`,
        color: "#6366f1",
        startsAt: now,
        endsAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log("✅ Seed completado");
  console.log(`   Admin: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
