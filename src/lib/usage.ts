import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Per-user, per-calendar-month quotas for every feature that spends Claude API
// tokens. Kept deliberately low: the monthly Claude budget is small and shared
// across all users, so these are conservative ceilings meant to stop a single
// account from burning the budget — not generous day-to-day allowances. Each
// limit is enforced atomically in the DB (see the consume_* RPCs) so concurrent
// requests can't slip past it. Bump these numbers here (and only here) if the
// budget grows; the per-user cost of maxing every feature is roughly:
//   analyzer ~$0.10/run · resume ~$0.02/parse · research chat ~$0.06/msg ·
//   deadline lookup ~$0.06/uncached-lookup.

/** Max Angle Analyzer runs a user gets per calendar month. Expensive: 3 Sonnet calls. */
export const MAX_ANALYSIS_RUNS = 2;

/** Max Resume Reader (import) parses a user gets per calendar month. */
export const MAX_RESUME_PARSES = 2;

/** Max College Research Helper messages a user gets per calendar month. Each may run web searches. */
export const MAX_RESEARCH_CHAT_MESSAGES = 3;

/** Max live (uncached) college deadline lookups a user gets per calendar month. */
export const MAX_DEADLINE_LOOKUPS = 2;

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
