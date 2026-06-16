import { createClient } from "@/lib/supabase/server";
import { lookupCollegeDeadlines, type DeadlineSuggestion } from "@/lib/deadline-lookup";

// Deadlines for an upcoming cycle are stable, so a shared cache entry stays
// usable for a while before we re-search.
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function cacheKey(collegeName: string) {
  return collegeName.trim().toLowerCase();
}

/**
 * Batch-reads cached deadline rounds for a set of colleges (by name), so the
 * dashboard can render known rounds immediately without any client-side lookup.
 * Returns a map keyed by cacheKey(name); missing/uncached colleges are absent.
 */
export async function getCachedDeadlinesByName(
  collegeNames: string[]
): Promise<Record<string, DeadlineSuggestion[]>> {
  if (collegeNames.length === 0) return {};
  const supabase = await createClient();
  const keys = [...new Set(collegeNames.map(cacheKey))];

  const { data, error } = await supabase
    .from("college_deadline_cache")
    .select("college_key, deadlines")
    .in("college_key", keys);

  if (error || !data) return {};

  const out: Record<string, DeadlineSuggestion[]> = {};
  for (const row of data) {
    out[row.college_key as string] = (row.deadlines as DeadlineSuggestion[]) ?? [];
  }
  return out;
}

/**
 * Returns a college's application-deadline suggestions, served from the shared
 * Supabase cache when a fresh entry exists and only hitting the live web search
 * (slow + paid) on a cache miss. Degrades to a plain lookup if the cache table
 * isn't set up.
 */
export async function getCollegeDeadlineSuggestions(
  collegeName: string
): Promise<DeadlineSuggestion[]> {
  const supabase = await createClient();
  const key = cacheKey(collegeName);

  const { data, error } = await supabase
    .from("college_deadline_cache")
    .select("deadlines, fetched_at")
    .eq("college_key", key)
    .maybeSingle();

  if (!error && data) {
    const ageMs = Date.now() - new Date(data.fetched_at as string).getTime();
    if (ageMs < CACHE_TTL_MS) {
      return (data.deadlines as DeadlineSuggestion[]) ?? [];
    }
  }

  const found = await lookupCollegeDeadlines(collegeName);

  // Only cache useful results, so an empty/transient miss can be retried.
  // Best-effort write: ignore failures (e.g. cache table not created yet).
  if (found.length > 0) {
    await supabase
      .from("college_deadline_cache")
      .upsert(
        {
          college_key: key,
          college_name: collegeName.trim(),
          deadlines: found,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "college_key" }
      );
  }

  return found;
}
