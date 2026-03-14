import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only initialize if keys exist to avoid the "supabaseKey is required" crash
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase keys are missing in .env.local" }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return NextResponse.json(data || {});
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch latest" }, { status: 500 });
  }
}