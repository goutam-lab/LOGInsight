import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { redis } from "./app/lib/redis";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const worker = new Worker(
  "analysis-queue",
  async (job) => {
    // This log will tell us the worker is actually moving
    console.log(`🚀 WORKER DETECTED JOB: ${job.id} for file: ${job.data.fileName}`);

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openrouter/hunter-alpha",
          messages: [
            { role: "system", content: "You are a Senior SRE. Analyze the logs and provide a fix." },
            { role: "user", content: job.data.content }
          ],
        }),
      });

      const result = await response.json();
      const analysisText = result.choices?.[0]?.message?.content || "No analysis generated.";

      await supabase.from("analysis_history").insert({
        file_name: job.data.fileName,
        analysis_content: analysisText,
        user_id: job.data.userId,
      });

      console.log(`✅ Analysis complete for ${job.data.fileName}`);
    } catch (err) {
      console.error(`❌ Worker Job ${job.id} Failed:`, err);
    }
  },
  { connection: redis as any } // Use the exact same redis instance
);

worker.on('ready', () => console.log("🚀 LogInsight Worker is active and connected to Upstash!"));