import { createClient } from "@/lib/supabase/server";
import type { AnalyzeResult } from "@/app/api/analyze/route";

export async function getSavedAnalysis(userId: string): Promise<AnalyzeResult | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_analyses")
    .select("result")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.result as AnalyzeResult) ?? null;
}
