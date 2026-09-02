import { PrismaClient } from "@prisma/client";

function resolveDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return url;
  // Render Postgres requires SSL; append if missing (common deploy misconfig).
  if (
    process.env.NODE_ENV === "production" &&
    !url.includes("sslmode=") &&
    !url.includes("ssl=")
  ) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}sslmode=require`;
  }
  return url;
}

const prisma = new PrismaClient({
  log: ["error", "warn"],
  datasources: {
    db: {
      url: resolveDatabaseUrl(),
    },
  },
});

export default prisma;
