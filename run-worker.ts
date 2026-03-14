import dotenv from "dotenv";
dotenv.config(); // Load other variables like Supabase and OpenRouter

import { Worker } from "bullmq";
import { redis } from "./app/lib/redis"; // Imports the hardcoded connection
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

console.log("🚀 LogInsight Worker is starting with hardcoded Redis URL...");

const worker = new Worker(
  "analysis-queue",
  async (job) => {
    console.log(`🚀 WORKER DETECTED JOB: ${job.id}`);
    // Your processing logic...
  },
  { connection: redis as any } // Type cast to prevent version mismatch
);

worker.on('ready', () => console.log("✅ Worker connected to Upstash Redis!"));
worker.on('error', (err) => console.error("❌ Worker connection error:", err));