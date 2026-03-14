import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { redis } from "./app/lib/redis"; //
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

console.log("🚀 LogInsight Worker is starting...");

const worker = new Worker(
  "analysis-queue",
  async (job) => {
    const { content, fileName, userId } = job.data;
    console.log(`🚀 Processing Job ${job.id} for file: ${fileName}`);

    try {
      // 1. AI Analysis Logic (Moved from API to Worker for stability)
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openrouter/hunter-alpha",
          messages: [
            {
              role: "system",
              content: `You are a Senior SRE. 
              TASKS:
              1. SUMMARY: Briefly explain the root cause.
              2. VISUALS: Mention the count of 'Critical', 'Error', and 'Warning' events.
              3. ACTIONABLE FIX: Provide the exact terminal command in a 'bash' markdown block.`
            },
            { role: "user", content: `LOG DATA:\n${content.slice(0, 15000)}` }
          ],
        }),
      });

      const aiData = await response.json();
      const analysisContent = aiData.choices[0].message.content;

      // 2. Insert into Supabase (This triggers the Realtime broadcast)
      const { error } = await supabase
        .from("analysis_history")
        .insert([
          {
            user_id: userId,
            file_name: fileName,
            analysis_content: analysisContent,
            created_at: new Date().toISOString(),
          }
        ]);

      if (error) throw error;
      console.log(`✅ Analysis successfully saved for ${fileName}`);

    } catch (err) {
      console.error(`❌ Worker Error in Job ${job.id}:`, err);
      throw err;
    }
  },
  { connection: redis as any }
);

worker.on('ready', () => console.log("✅ Worker connected to Upstash Redis!"));
worker.on('error', (err) => console.error("❌ Worker connection error:", err));