import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let logContent = "";
    let fileName = "external-stream";

    // Handle different ingestion types
    if (contentType.includes("application/json")) {
      const data = await req.json();
      logContent = data.log_content || JSON.stringify(data);
      fileName = data.metadata?.fileName || "webhook-event";
    } else {
      // Handle raw text/logs piped from CLI
      logContent = await req.text();
    }

    if (!logContent) {
      return NextResponse.json({ error: "No content received" }, { status: 400 });
    }

    // Since we are moving away from complex workers for now, 
    // we can trigger the analysis immediately or store it in Supabase.
    // For a "Live" feel, we'll return the ingestion status.
    
    console.log(`📥 Received stream from ${fileName} (${logContent.length} bytes)`);

    return NextResponse.json({ 
      status: "received",
      source: fileName,
      timestamp: new Date().toISOString()
    }, { status: 202 });

  } catch (error) {
    console.error("❌ Ingestion Error:", error);
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}