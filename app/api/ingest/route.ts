import { NextResponse } from "next/server";
import { analysisQueue } from "@/app/lib/queue";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { log_content, metadata } = data;

    // Adding the job to the "analysis-queue"
    const job = await analysisQueue.add("process-log", {
      content: log_content,
      fileName: metadata?.fileName || "external-stream",
      userId: metadata?.userId 
    });

    console.log(`✅ Job ${job.id} successfully queued`);

    return NextResponse.json({ 
      status: "queued", 
      jobId: job.id 
    }, { status: 202 });
  } catch (error) {
    console.error("❌ Ingestion Error:", error);
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}