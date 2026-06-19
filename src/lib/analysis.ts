import { createClient } from "@/lib/supabase/server";
import type { AnalyzeResult, NarrativeAngle } from "@/app/api/analyze/route";

export async function getSavedAnalysis(userId: string): Promise<AnalyzeResult | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_analyses")
    .select("result")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.result as AnalyzeResult) ?? null;
}

// The strongest (top-ranked) angle from the user's most recent analysis, or
// null if they haven't run the analyzer yet.
export async function getTopAngle(userId: string): Promise<NarrativeAngle | null> {
  const analysis = await getSavedAnalysis(userId);
  return analysis?.angles?.[0] ?? null;
}
