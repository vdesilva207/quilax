/**
 * Semilla usuarios para k6 / load tests.
 *
 *   node scripts/seed-loadtest-users.mjs [count]
 *
 * Crea loadtest1@quilax.local … loadtestN@quilax.local
 * Password: LoadTest2026!
 * Balance: 100 créditos
 * También escribe loadtest/k6/users.json
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const COUNT = Math.min(1_050_000, Math.max(1, Number(process.argv[2] || 100)));
const PASSWORD = "LoadTest2026!";
const PREFIX = "loadtest";
const DOMAIN = "quilax.local";

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 8);
  const users = [];

  for (let i = 1; i <= COUNT; i++) {
    const email = `${PREFIX}${i}@${DOMAIN}`;
    const username = `Load${i}`;
    let user = await prisma.user.findFirst({
      where: { email, role: "USER" },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          username,
          password: hash,
          role: "USER",
          balance: 100,
          emailVerified: true,
          fullName: `Load Test ${i}`,
        },
      });
    } else if ((user.balance ?? 0) < 20) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { balance: { increment: 50 } },
      });
    }
    users.push({ email, password: PASSWORD, id: user.id });
    if (i % 50 === 0) process.stdout.write(`\r  seeded ${i}/${COUNT}`);
  }
  process.stdout.write(`\r  seeded ${COUNT}/${COUNT}\n`);

  const outDir = path.resolve("..", "loadtest", "k6");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "users.json");
  fs.writeFileSync(outFile, JSON.stringify(users, null, 2));
  console.log(
    JSON.stringify(
      {
        count: users.length,
        password: PASSWORD,
        sample: users.slice(0, 3).map((u) => u.email),
        usersFile: outFile,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
