import { createClient } from "@/lib/supabase/server";

function isMissingSourceUrlColumn(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("source_url") &&
    (m.includes("does not exist") || m.includes("schema cache") || m.includes("could not find"))
  );
}

function isMissingDeadlinesTable(message: string) {
  const normalizedMessage = message.toLowerCase();

  // A missing column also mentions the table name; treat that case separately
  // so we don't tell the user the whole table is missing.
  if (isMissingSourceUrlColumn(normalizedMessage)) return false;

  return (
    normalizedMessage.includes("user_college_deadlines") &&
    (normalizedMessage.includes("schema cache") ||
      normalizedMessage.includes("does not exist") ||
      normalizedMessage.includes("could not find the table"))
  );
}

export function getMissingDeadlinesTableMessage(errorMessage: string) {
  if (isMissingSourceUrlColumn(errorMessage)) {
    return "Deadline tracking needs a schema update. In Supabase, run: alter table public.user_college_deadlines add column if not exists source_url text; then notify pgrst, 'reload schema';";
  }

  if (isMissingDeadlinesTable(errorMessage)) {
    return "Deadline tracking is not set up in Supabase yet. Run `supabase/deadlines_schema.sql` to enable this feature.";
  }

  return errorMessage;
}

export type CollegeDeadline = {
  id: string;
  userCollegeId: string;
  collegeName: string;
  label: string;
  dueDate: string; // ISO date (YYYY-MM-DD)
  sourceUrl: string; // official page to verify the date ("" if none)
};

type SupabaseDeadlineRow = {
  id: string;
  user_college_id: string;
  college_name: string;
  label: string;
  due_date: string;
  source_url: string | null;
};

function mapDeadline(row: SupabaseDeadlineRow): CollegeDeadline {
  return {
    id: row.id,
    userCollegeId: row.user_college_id,
    collegeName: row.college_name,
    label: row.label,
    dueDate: row.due_date,
    sourceUrl: row.source_url ?? "",
  };
}

export async function getUserDeadlines(userId: string): Promise<CollegeDeadline[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_college_deadlines")
    .select("id, user_college_id, college_name, label, due_date, source_url")
    .eq("user_id", userId)
    .order("due_date", { ascending: true });

  if (error) {
    if (isMissingDeadlinesTable(error.message)) {
      return [];
    }

    // Table exists but the source_url column hasn't been added yet: still show
    // deadlines (without verify links) instead of crashing the dashboard.
    if (isMissingSourceUrlColumn(error.message)) {
      const { data: legacy, error: legacyError } = await supabase
        .from("user_college_deadlines")
        .select("id, user_college_id, college_name, label, due_date")
        .eq("user_id", userId)
        .order("due_date", { ascending: true });

      if (legacyError) {
        if (isMissingDeadlinesTable(legacyError.message)) return [];
        throw new Error(legacyError.message);
      }

      return ((legacy as Omit<SupabaseDeadlineRow, "source_url">[] | null) ?? []).map((row) =>
        mapDeadline({ ...row, source_url: null })
      );
    }

    throw new Error(error.message);
  }

  return ((data as SupabaseDeadlineRow[] | null) ?? []).map(mapDeadline);
}
