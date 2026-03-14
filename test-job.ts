// test-job.ts
import { analysisQueue } from "./app/lib/queue";
import dotenv from "dotenv";
dotenv.config();

async function addTestJob() {
  const job = await analysisQueue.add("process-log", {
    content: "ERROR: Database connection failed at 04:00 AM",
    fileName: "test-log.txt",
    userId: "test-user-123"
  });
  console.log("✅ Test job added with ID:", job.id);
  process.exit(0);
}

addTestJob();