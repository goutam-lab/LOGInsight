import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Ollama local LLM configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "deepseek-coder";

/**
 * Sanitize common LLM JSON output issues:
 * - Single quotes → double quotes
 * - JS-style comments (// ...)
 * - Trailing commas before } or ]
 */
function sanitizeJSON(text: string): string {
  let s = text;
  // Remove single-line comments (// ...)
  s = s.replace(/\/\/[^\n]*/g, '');
  // Replace single quotes with double quotes (careful with apostrophes in text)
  s = s.replace(/'/g, '"');
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, '$1');
  return s;
}

/**
 * Extract JSON from LLM response text.
 * Handles markdown code blocks, single quotes, comments, etc.
 */
function extractJSON(text: string): any {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {}

  // Try sanitized direct parse
  try {
    return JSON.parse(sanitizeJSON(text));
  } catch {}

  // Try extracting from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const block = codeBlockMatch[1].trim();
    try { return JSON.parse(block); } catch {}
    try { return JSON.parse(sanitizeJSON(block)); } catch {}
  }

  // Try finding the first { ... } block
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const block = jsonMatch[0];
    try { return JSON.parse(block); } catch {}
    try { return JSON.parse(sanitizeJSON(block)); } catch {}
  }

  throw new Error(`Could not extract valid JSON from LLM response: ${text.slice(0, 500)}`);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const logText = await file.text();
    const fileName = file.name || "uploaded-log";

    // 1. Fetch last 3 incidents for historical context
    const { data: pastIncidents } = await supabase
      .from('analyses')
      .select('summary, fix')
      .order('created_at', { ascending: false })
      .limit(3);

    const historyContext = pastIncidents?.length 
      ? `PAST SIMILAR INCIDENTS:\n${pastIncidents.map(i => `- ${i.summary}: Fixed by ${i.fix}`).join('\n')}`
      : "No past incidents found.";

    // 2. AI Analysis via Local Ollama LLM (OpenAI-compatible endpoint)
    const aiResponse = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a Senior SRE (Site Reliability Engineer). Analyze the provided server/application logs.
Check if this issue matches the history provided below. If it does, set 'is_recurring' to true.

${historyContext}

You MUST respond with ONLY valid JSON (no extra text before or after). Use this exact format:
{
  "summary": "Brief one-line root cause description",
  "metrics": { "critical": 0, "error": 0, "warning": 0 },
  "analysis": "Detailed multi-line analysis of what went wrong",
  "fix": "The exact terminal command or step-by-step fix",
  "is_recurring": false
}

Count the actual number of CRITICAL, ERROR, and WARNING level entries in the logs for the metrics.`
          },
          { role: "user", content: `LOG DATA:\n${logText.slice(0, 4000)}` }
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`Ollama API error (${aiResponse.status}): ${errText}`);
    }

    const aiData = await aiResponse.json();

    if (!aiData?.choices?.[0]?.message?.content) {
      throw new Error(`Invalid Ollama response format: ${JSON.stringify(aiData).slice(0, 500)}`);
    }

    const rawContent = aiData.choices[0].message.content;
    const result = extractJSON(rawContent);

    // Ensure all required fields exist with defaults
    const normalizedResult = {
      summary: result.summary || "Log analysis complete",
      metrics: {
        critical: result.metrics?.critical ?? 0,
        error: result.metrics?.error ?? 0,
        warning: result.metrics?.warning ?? 0,
      },
      analysis: result.analysis || "No detailed analysis available.",
      fix: result.fix || "No automated fix suggested.",
      is_recurring: result.is_recurring ?? false,
    };

    // 3. Persist the new analysis
    const { error } = await supabase.from('analyses').insert([{
      summary: normalizedResult.summary,
      analysis: normalizedResult.analysis,
      fix: normalizedResult.fix,
      metrics: normalizedResult.metrics,
      file_name: fileName,
      is_recurring: normalizedResult.is_recurring
    }]);

    if (error) console.error("Supabase Save Error:", error);

    return NextResponse.json(normalizedResult);
  } catch (error) {
    console.error("Analysis Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error processing logs" }, 
      { status: 500 }
    );
  }
}