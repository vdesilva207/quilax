import { createRedisClient } from "./redisClient.js";

const redis = createRedisClient();

redis.on("connect", () => {
  console.log("🟢 Redis conectado");
});

redis.on("error", (err) => {
  console.error("🔴 Redis error:", err);
});

export default redis;


  

