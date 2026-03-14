import { Queue } from "bullmq";
import { redis } from "./redis";

// This name MUST match the name in run-worker.ts exactly
export const analysisQueue = new Queue("analysis-queue", { 
  connection: redis as any 
});