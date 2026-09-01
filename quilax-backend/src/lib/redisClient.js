import Redis from "ioredis";

/** Shared Redis connection options for ioredis and Bull. */
export function getRedisConnectionOptions() {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  const options = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number.parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  };

  if (process.env.REDIS_TLS === "true" || process.env.REDIS_TLS === "1") {
    options.tls = {};
  }

  return options;
}

export function createRedisClient(overrides = {}) {
  const base = getRedisConnectionOptions();
  if (typeof base === "string") {
    return new Redis(base, {
      maxRetriesPerRequest: null,
      ...overrides,
    });
  }

  return new Redis({
    ...base,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    ...overrides,
  });
}

export function getBullRedisOptions() {
  const base = getRedisConnectionOptions();
  if (typeof base === "string") {
    return base;
  }

  return {
    ...base,
    db: Number.parseInt(process.env.REDIS_DB, 10) || 0,
    keyPrefix: "bull:",
    maxRetriesPerRequest: 1,
  };
}
