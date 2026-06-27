import { revalidatePath } from "next/cache";
import { ActivityListWorkspace } from "@/components/activity-list-workspace";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActivityListEntries, type ActivityListEntry } from "@/lib/activity-lists";
import { getUserProfileData, type Activity, type Honor } from "@/lib/profile";

function cleanActivity(activity: Activity) {
  return {
    activity_type: activity.activity_type?.trim() ?? "",
    position_title: activity.position_title?.trim() ?? "",
    organization: activity.organization?.trim() ?? "",
    description: activity.description?.trim() ?? "",
    grade_9: Boolean(activity.grade_9),
    grade_10: Boolean(activity.grade_10),
    grade_11: Boolean(activity.grade_11),
    grade_12: Boolean(activity.grade_12),
    avg_hours_per_week: activity.avg_hours_per_week ? Number(activity.avg_hours_per_week) : null,
    avg_weeks_per_year: activity.avg_weeks_per_year ? Number(activity.avg_weeks_per_year) : null,
  };
}

function activityHasContent(activity: ReturnType<typeof cleanActivity>) {
  return Boolean(activity.activity_type || activity.position_title || activity.organization || activity.description);
}

function cleanHonor(honor: Honor) {
  return {
    title: honor.title?.trim() ?? "",
    grade_9: Boolean(honor.grade_9),
    grade_10: Boolean(honor.grade_10),
    grade_11: Boolean(honor.grade_11),
    grade_12: Boolean(honor.grade_12),
    recognition_level: honor.recognition_level?.trim() ?? "",
    eligibility_requirements: honor.eligibility_requirements?.trim() ?? "",
    achievement_description: honor.achievement_description?.trim() ?? "",
  };
}

function honorHasContent(honor: ReturnType<typeof cleanHonor>) {
  return Boolean(
    honor.title ||
      honor.grade_9 ||
      honor.grade_10 ||
      honor.grade_11 ||
      honor.grade_12 ||
      honor.eligibility_requirements ||
      honor.achievement_description
  );
}

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

  async function saveWorkspace(payload: {
    activities: Activity[];
    honors: Honor[];
    entries: ActivityListEntry[];
  }) {
    "use server";
    const currentUser = await requireUser();
    const supabase = await createClient();

    const { activities, honors, entries } = payload;

    const commonActivities = entries.filter((e) => e.platform === "common_app" && e.source_kind === "activity");
    const commonHonors = entries.filter((e) => e.platform === "common_app" && e.source_kind === "honor");
    const ucEntries = entries.filter((e) => e.platform === "uc");

    if (commonActivities.length > 10 || commonHonors.length > 5 || ucEntries.length > 20) {
      return { error: "A platform entry limit was exceeded. Remove entries before saving." };
    }

    // Replace the master profile activities + honors.
    const cleanedActivities = activities.map(cleanActivity).filter(activityHasContent);
    const cleanedHonors = honors.map(cleanHonor).filter(honorHasContent);

    const { error: deleteActivitiesError } = await supabase.from("user_activities").delete().eq("user_id", currentUser.id);
    if (deleteActivitiesError) return { error: deleteActivitiesError.message };
    const { error: deleteHonorsError } = await supabase.from("user_honors").delete().eq("user_id", currentUser.id);
    if (deleteHonorsError) return { error: deleteHonorsError.message };

    if (cleanedActivities.length) {
      const { error } = await supabase
        .from("user_activities")
        .insert(cleanedActivities.map((activity) => ({ user_id: currentUser.id, ...activity })));
      if (error) return { error: error.message };
    }
    if (cleanedHonors.length) {
      const { error } = await supabase
        .from("user_honors")
        .insert(cleanedHonors.map((honor) => ({ user_id: currentUser.id, ...honor })));
      if (error) return { error: error.message };
    }

    // Replace the platform drafts.
    const { error: deleteEntriesError } = await supabase
      .from("user_activity_list_entries")
      .delete()
      .eq("user_id", currentUser.id);
    if (deleteEntriesError) return { error: deleteEntriesError.message };

    if (entries.length) {
      const rows = entries.map((entry, index) => ({ user_id: currentUser.id, ...cleanEntry(entry, index) }));
      const { error } = await supabase.from("user_activity_list_entries").insert(rows);
      if (error) return { error: error.message };
    }

    revalidatePath("/activity-lists");
    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return { success: true };
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-ivory text-foreground">
      <WorkspaceLayout activePage="activity-lists" profile={profile} mainClassName="px-4 py-5 sm:px-6 lg:px-8">
        <ActivityListWorkspace profile={profile} initialEntries={initialEntries} saveAction={saveWorkspace} />
      </WorkspaceLayout>
    </div>
  );
}
