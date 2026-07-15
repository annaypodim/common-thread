import { createClient } from "@/lib/supabase/server";
import { lookupCollegeDeadlines, type DeadlineSuggestion } from "@/lib/deadline-lookup";
import { MAX_DEADLINE_LOOKUPS } from "@/lib/usage";

// Deadlines for an upcoming cycle are stable, so a shared cache entry stays
// usable for a while before we re-search.
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** Thrown when a user has used up their monthly live-lookup quota. */
export class DeadlineLookupLimitError extends Error {
  constructor() {
    super(
      `You've used all ${MAX_DEADLINE_LOOKUPS} deadline lookups for this month. You can still add deadlines manually.`
    );
    this.name = "DeadlineLookupLimitError";
  }
}

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
      // Cache hit: no web search, so it doesn't count against the user's quota.
      return (data.deadlines as DeadlineSuggestion[]) ?? [];
    }
  }

  // Cache miss: this triggers a live (paid) web search, so reserve one lookup
  // for this month first. Atomic in the DB, so it can't be raced past.
  const { data: lookupCount, error: usageError } = await supabase.rpc(
    "consume_deadline_lookup",
    { max_lookups: MAX_DEADLINE_LOOKUPS }
  );

  if (usageError) {
    // If usage tracking isn't set up, fail closed rather than let lookups run
    // uncapped — surfaced to the caller as a generic lookup error.
    console.error("consume_deadline_lookup error:", usageError);
    throw new Error(
      "Usage tracking is not set up. Run supabase/resume_deadline_rate_limit_schema.sql in Supabase."
    );
  }

  if (lookupCount === -1) {
    throw new DeadlineLookupLimitError();
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
