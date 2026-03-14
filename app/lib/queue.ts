import { Queue } from "bullmq";
import { redis } from "./redis";

export const analysisQueue = new Queue("analysis-queue", { 
  // "as any" solves the version mismatch between ioredis and bullmq
  connection: redis as any 
});