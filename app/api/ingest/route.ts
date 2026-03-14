import { NextResponse } from "next/server";
import { analysisQueue } from "@/app/lib/queue";

export async function POST(req: Request) {
  try {
    const data = await req.json(); // Log data from external shipper
    const { log_content, metadata } = data;

    // Push to background queue
    const job = await analysisQueue.add("process-log", {
      content: log_content,
      fileName: metadata?.fileName || "external-stream",
      userId: metadata?.userId // Associate with a specific user
    });

    return NextResponse.json({ 
      status: "queued", 
      jobId: job.id 
    }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}