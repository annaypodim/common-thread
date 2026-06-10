import { createClient } from "@/lib/supabase/server";

function isMissingUserCollegesTable(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("public.user_colleges") &&
    (normalizedMessage.includes("schema cache") ||
      normalizedMessage.includes("does not exist") ||
      normalizedMessage.includes("could not find the table"))
  );
}

export type CollegeRecord = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  aliases?: string[];
};

export type SavedCollege = {
  id: string;
  collegeName: string;
  state: string;
  intendedMajor: string;
  address: string;
  city: string;
  zip: string;
  website: string;
};

type SupabaseCollegeRow = {
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  website: string | null;
  aliases?: string[] | null;
};

function mapCollege(row: SupabaseCollegeRow): CollegeRecord {
  return {
    name: row.name,
    address: row.address ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    zip: row.zip ?? "",
    website: row.website ?? "",
    aliases: row.aliases ?? [],
  };
}

export async function searchColleges(query: string, limit = 8): Promise<CollegeRecord[]> {
  const supabase = await createClient();
  const normalizedQuery = query.trim();
  const resultLimit = Math.max(1, Math.min(limit, 25));

  const { data, error } = await supabase.rpc("search_colleges", {
    search_query: normalizedQuery,
    max_results: resultLimit,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as SupabaseCollegeRow[] | null) ?? []).map(mapCollege);
}

export async function getUserSavedColleges(userId: string): Promise<SavedCollege[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_colleges")
    .select("id, college_name, state, intended_major, address, city, zip, website")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

  if (error) {
    if (isMissingUserCollegesTable(error.message)) {
      return [];
    }

    throw new Error(error.message);
  }

  return ((data as Array<{
    id: string;
    college_name: string;
    state: string | null;
    intended_major: string | null;
    address: string | null;
    city: string | null;
    zip: string | null;
    website: string | null;
  }> | null) ?? []).map((college) => ({
    id: college.id,
    collegeName: college.college_name,
    state: college.state ?? "",
    intendedMajor: college.intended_major ?? "",
    address: college.address ?? "",
    city: college.city ?? "",
    zip: college.zip ?? "",
    website: college.website ?? "",
  }));
}

export function getMissingUserCollegesTableMessage(errorMessage: string) {
  if (isMissingUserCollegesTable(errorMessage)) {
    return "Saved colleges are not set up in Supabase yet. Run `supabase/college_schema.sql` to enable this feature.";
  }

  return errorMessage;
}
