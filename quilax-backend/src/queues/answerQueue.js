import { Queue } from "bullmq";
import redis from "../lib/redis.js";

export const answerQueue = new Queue("answers", {
  connection: redis,
});