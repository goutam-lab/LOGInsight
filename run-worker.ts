import { Worker } from "bullmq";
import { redis } from "./app/lib/redis";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Initializing Supabase with your project URL
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use Service Role Key for backend access
);

console.log("🚀 LogInsight Worker is active and waiting for logs...");

const worker = new Worker(
  "analysis-queue",
  async (job) => {
    const { content, fileName, userId } = job.data;
    console.log(`🔍 Processing Log: ${fileName}`);

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
            { role: "user", content }
          ],
        }),
      });

      const result = await response.json();
      const analysisText = result.choices[0].message.content;

      // Save the result back to your analysis_history table
      await supabase.from("analysis_history").insert({
        file_name: fileName,
        analysis_content: analysisText,
        user_id: userId,
      });

      console.log(`✅ Analysis complete for ${fileName}`);
    } catch (err) {
      console.error("❌ Worker Job Failed:", err);
      throw err;
    }
  },
  { connection: redis }
);