// app/api/analyze/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const logText = await file.text();

    let processedContent = logText;

    // If file is larger than 50KB, we start "Smart Snipping"
    if (logText.length > 50000) {
      const lines = logText.split('\n');
      const importantLines = new Set<number>();
      const keywords = [/error/i, /critical/i, /exception/i, /fatal/i, /500/i];

      lines.forEach((line, index) => {
        if (keywords.some(regex => regex.test(line))) {
          // Grab 5 lines of context around the error
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
        processedContent = "No explicit errors found in initial scan. Analyzing first 200 lines:\n" + lines.slice(0, 200).join('\n');
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
        content: `You are a Senior SRE. When providing a fix, ALWAYS include the exact terminal command required inside a markdown code block labeled 'bash' or 'sh'. 
        Example:
        Root Cause: Memory leak.
        Suggested Fix: Restart the service.
        \`\`\`bash
        systemctl restart my-service
        \`\`\`
        Keep your analysis concise and high-impact.`
      },
          { role: "user", content: `LOG SNIPPETS:\n${processedContent}` }
        ],
      }),
    });

    return new NextResponse(response.body);
  } catch (error) {
    return new NextResponse("Error processing large file", { status: 500 });
  }
}