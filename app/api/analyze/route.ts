import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // 2. AI Analysis with History Context
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter/hunter-alpha",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a Senior SRE. Analyze the logs. 
            Check if this issue matches the history provided below. 
            If it does, set 'is_recurring' to true.
            
            ${historyContext}

            Return JSON: { 
              "summary": string, 
              "metrics": { "critical": number, "error": number, "warning": number }, 
              "analysis": string, 
              "fix": string,
              "is_recurring": boolean 
            }`
          },
          { role: "user", content: `LOG DATA:\n${logText.slice(0, 5000)}` }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    const result = JSON.parse(aiData.choices[0].message.content);

    // 3. Persist the new analysis
    const { error } = await supabase.from('analyses').insert([{
      summary: result.summary,
      analysis: result.analysis,
      fix: result.fix,
      metrics: result.metrics,
      file_name: fileName,
      is_recurring: result.is_recurring // Ensure this column exists in Supabase
    }]);

    if (error) console.error("Supabase Save Error:", error);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis Error:", error);
    return new NextResponse("Error processing logs", { status: 500 });
  }
}