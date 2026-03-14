// run-worker.ts
import { Worker } from "bullmq";
import { redis } from "../lib/redis";

console.log("🚀 Worker is hunting for logs...");

const worker = new Worker("analysis-queue", async (job) => {
  console.log(`Working on: ${job.data.fileName}`);
  // Add your AI logic here...
  return { done: true };
}, { connection: redis });