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

export async function getAllColleges(): Promise<CollegeRecord[]> {
  const supabase = await createClient();
  const pageSize = 1000;
  const allColleges: CollegeRecord[] = [];
  let start = 0;

  while (true) {
    const end = start + pageSize - 1;
    const { data, error } = await supabase
      .from("colleges")
      .select("name, address, city, state, zip, website")
      .order("name", { ascending: true })
      .range(start, end);

    if (error) {
      throw new Error(error.message);
    }

    const batch = (data as CollegeRecord[] | null) ?? [];
    allColleges.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    start += pageSize;
  }

  return allColleges;
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
