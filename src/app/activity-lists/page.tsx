import { revalidatePath } from "next/cache";
import { ActivityListWorkspace } from "@/components/activity-list-workspace";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActivityListEntries, type ActivityListEntry } from "@/lib/activity-lists";
import { getUserProfileData } from "@/lib/profile";

function cleanEntry(entry: ActivityListEntry, index: number) {
  const descriptionLimit = entry.platform === "uc" ? 350 : entry.source_kind === "honor" ? 100 : 150;
  return {
    platform: entry.platform,
    source_kind: entry.source_kind,
    source_id: entry.source_id || null,
    category: entry.category.trim(),
    title: entry.title.trim(),
    position_title: entry.position_title.trim().slice(0, entry.platform === "common_app" ? 50 : undefined),
    organization: entry.organization.trim().slice(0, entry.platform === "common_app" ? 100 : undefined),
    description: entry.description.trim().slice(0, descriptionLimit),
    grade_9: Boolean(entry.grade_9),
    grade_10: Boolean(entry.grade_10),
    grade_11: Boolean(entry.grade_11),
    grade_12: Boolean(entry.grade_12),
    hours_per_week: entry.hours_per_week ? Number(entry.hours_per_week) : null,
    weeks_per_year: entry.weeks_per_year ? Number(entry.weeks_per_year) : null,
    sort_order: index,
  };
}

export default async function ActivityListsPage() {
  const user = await requireUser();
  const [profile, initialEntries] = await Promise.all([
    getUserProfileData(user.id),
    getActivityListEntries(user.id),
  ]);

  async function saveDrafts(entries: ActivityListEntry[]) {
    "use server";
    const currentUser = await requireUser();
    const supabase = await createClient();
    const commonActivities = entries.filter((e) => e.platform === "common_app" && e.source_kind === "activity");
    const commonHonors = entries.filter((e) => e.platform === "common_app" && e.source_kind === "honor");
    const ucEntries = entries.filter((e) => e.platform === "uc");

    if (commonActivities.length > 10 || commonHonors.length > 5 || ucEntries.length > 20) {
      return { error: "A platform entry limit was exceeded. Remove entries before saving." };
    }

    const { error: deleteError } = await supabase
      .from("user_activity_list_entries")
      .delete()
      .eq("user_id", currentUser.id);
    if (deleteError) return { error: deleteError.message };

    if (entries.length) {
      const rows = entries.map((entry, index) => ({ user_id: currentUser.id, ...cleanEntry(entry, index) }));
      const { error } = await supabase.from("user_activity_list_entries").insert(rows);
      if (error) return { error: error.message };
    }

    revalidatePath("/activity-lists");
    return { success: true };
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-ivory text-foreground">
      <WorkspaceLayout activePage="activity-lists" profile={profile} mainClassName="px-4 py-5 sm:px-6 lg:px-8">
        <ActivityListWorkspace profile={profile} initialEntries={initialEntries} saveAction={saveDrafts} />
      </WorkspaceLayout>
    </div>
  );
}
