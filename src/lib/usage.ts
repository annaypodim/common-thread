import { createClient } from "@/lib/supabase/server";

/** Max Angle Analyzer runs a user gets per calendar month. */
export const MAX_ANALYSIS_RUNS = 4;

export type AnalysisUsage = {
  used: number;
  remaining: number;
  limit: number;
};

function currentPeriod(): string {
  // 'YYYY-MM' in UTC — must match consume_analysis_run() in the DB.
  return new Date().toISOString().slice(0, 7);
}

/** Read-only view of the caller's usage this month (for display/gating). */
export async function getAnalysisUsage(userId: string): Promise<AnalysisUsage> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("analysis_usage")
    .select("run_count")
    .eq("user_id", userId)
    .eq("period", currentPeriod())
    .maybeSingle();

  const used = data?.run_count ?? 0;
  return {
    used,
    remaining: Math.max(0, MAX_ANALYSIS_RUNS - used),
    limit: MAX_ANALYSIS_RUNS,
  };
}
