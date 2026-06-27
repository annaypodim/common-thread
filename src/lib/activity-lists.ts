import { createClient } from "@/lib/supabase/server";

export type ActivityPlatform = "common_app" | "uc";
export type ActivitySourceKind = "activity" | "honor";

export type ActivityListEntry = {
  id?: string;
  platform: ActivityPlatform;
  source_kind: ActivitySourceKind;
  source_id?: string | null;
  category: string;
  title: string;
  position_title: string;
  organization: string;
  description: string;
  grade_9: boolean;
  grade_10: boolean;
  grade_11: boolean;
  grade_12: boolean;
  hours_per_week: string;
  weeks_per_year: string;
  sort_order: number;
};

export async function getActivityListEntries(userId: string): Promise<ActivityListEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_activity_list_entries")
    .select(
      "id, platform, source_kind, source_id, category, title, position_title, organization, description, grade_9, grade_10, grade_11, grade_12, hours_per_week, weeks_per_year, sort_order"
    )
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (error) {
    if (error.message.includes("user_activity_list_entries")) return [];
    throw new Error(error.message);
  }

  type StoredEntry = Omit<ActivityListEntry, "hours_per_week" | "weeks_per_year"> & {
    hours_per_week: number | null;
    weeks_per_year: number | null;
  };

  return ((data ?? []) as StoredEntry[]).map((entry) => ({
    ...entry,
    hours_per_week: entry.hours_per_week?.toString() ?? "",
    weeks_per_year: entry.weeks_per_year?.toString() ?? "",
  }));
}
