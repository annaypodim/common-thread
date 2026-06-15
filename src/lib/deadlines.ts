import { createClient } from "@/lib/supabase/server";

function isMissingDeadlinesTable(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("user_college_deadlines") &&
    (normalizedMessage.includes("schema cache") ||
      normalizedMessage.includes("does not exist") ||
      normalizedMessage.includes("could not find the table"))
  );
}

export function getMissingDeadlinesTableMessage(errorMessage: string) {
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
};

type SupabaseDeadlineRow = {
  id: string;
  user_college_id: string;
  college_name: string;
  label: string;
  due_date: string;
};

function mapDeadline(row: SupabaseDeadlineRow): CollegeDeadline {
  return {
    id: row.id,
    userCollegeId: row.user_college_id,
    collegeName: row.college_name,
    label: row.label,
    dueDate: row.due_date,
  };
}

export async function getUserDeadlines(userId: string): Promise<CollegeDeadline[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_college_deadlines")
    .select("id, user_college_id, college_name, label, due_date")
    .eq("user_id", userId)
    .order("due_date", { ascending: true });

  if (error) {
    if (isMissingDeadlinesTable(error.message)) {
      return [];
    }

    throw new Error(error.message);
  }

  return ((data as SupabaseDeadlineRow[] | null) ?? []).map(mapDeadline);
}
