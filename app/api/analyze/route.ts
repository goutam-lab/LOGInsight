import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const logText = await file.text();

    let processedContent = logText;

    // Smart Snipping (RAG-lite)
    if (logText.length > 50000) {
      const lines = logText.split('\n');
      const importantLines = new Set<number>();
      const keywords = [/error/i, /critical/i, /exception/i, /fatal/i, /500/i, /warn/i];

      lines.forEach((line, index) => {
        if (keywords.some(regex => regex.test(line))) {
          for (let i = Math.max(0, index - 5); i <= Math.min(lines.length - 1, index + 5); i++) {
            importantLines.add(i);
          }
        }
      });

      processedContent = Array.from(importantLines)
        .sort((a, b) => a - b)
        .map(idx => lines[idx])
        .join('\n');

      if (processedContent.length === 0) {
        processedContent = "Analyzing first 300 lines (No critical keywords found):\n" + lines.slice(0, 300).join('\n');
      }
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter/hunter-alpha",
        stream: true,
        messages: [
          {
            role: "system",
            content: `You are a Senior Site Reliability Engineer (SRE).
            
            TASKS:
            1. SUMMARY: Briefly explain the root cause.
            2. VISUALS: Mention the count of 'Critical', 'Error', and 'Warning' events found so the UI chart can render.
            3. ACTIONABLE FIX: Provide the exact terminal command required to fix the issue inside a markdown code block labeled 'bash'.
            
            FORMATTING RULES:
            - Always use code blocks for commands.
            - Keep descriptions high-impact and concise.
            - If multiple fixes exist, prioritize the safest one.`
          },
          { role: "user", content: `LOG DATA:\n${processedContent}` }
        ],
      }),
    });

    return new NextResponse(response.body);
  } catch (error) {
    return new NextResponse("Error processing logs", { status: 500 });
  }
}