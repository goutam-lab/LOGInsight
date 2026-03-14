// app/api/ingest/route.ts
import { NextResponse } from "next/server";
import { analysisQueue } from "@/app/lib/queue"; // Ensure this matches your queue.ts

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { log_content, metadata } = data;

    // This MUST match the queue name "analysis-queue"
    const job = await analysisQueue.add("process-log", {
      content: log_content,
      fileName: metadata?.fileName || "external-stream",
      userId: metadata?.userId 
    });

    console.log("🚀 Job added to queue:", job.id); // Add this to debug

    return NextResponse.json({ status: "queued", jobId: job.id }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}