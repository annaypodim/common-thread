import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileData, type Activity, type Honor } from "@/lib/profile";
import { ProfileForm } from "@/components/profile-form";
import { redirect } from "next/navigation";

function cleanActivities(activities: Activity[]) {
  return activities
    .map((activity) => ({
      id: activity.id,
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
    }))
    .filter((activity) => activity.activity_type || activity.position_title || activity.organization || activity.description);
}

function cleanHonors(honors: Honor[]) {
  return honors
    .map((honor) => ({
      id: honor.id,
      title: honor.title?.trim() ?? "",
      grade_9: Boolean(honor.grade_9),
      grade_10: Boolean(honor.grade_10),
      grade_11: Boolean(honor.grade_11),
      grade_12: Boolean(honor.grade_12),
      recognition_level: honor.recognition_level?.trim() ?? "",
      eligibility_requirements: honor.eligibility_requirements?.trim() ?? "",
      achievement_description: honor.achievement_description?.trim() ?? "",
    }))
    .filter(
      (honor) =>
        honor.title ||
        honor.grade_9 ||
        honor.grade_10 ||
        honor.grade_11 ||
        honor.grade_12 ||
        honor.eligibility_requirements ||
        honor.achievement_description
    );
}

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getUserProfileData(user.id);

  async function deleteActivity(activityId: string) {
    "use server";

    const currentUser = await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("user_activities")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("id", activityId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/dashboard");
    revalidatePath("/profile");
  }

  async function deleteHonor(honorId: string) {
    "use server";

    const currentUser = await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("user_honors")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("id", honorId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/dashboard");
    revalidatePath("/profile");
  }

  async function saveProfile(formData: FormData) {
    "use server";

    const currentUser = await requireUser();
    const supabase = await createClient();

    const highSchool = String(formData.get("highSchool") ?? "").trim();
    const intendedMajors = String(formData.get("intendedMajors") ?? "").trim();
    const rawActivities = JSON.parse(String(formData.get("activities") ?? "[]")) as Activity[];
    const rawHonors = JSON.parse(String(formData.get("honors") ?? "[]")) as Honor[];

    const activities = cleanActivities(rawActivities);
    const honors = cleanHonors(rawHonors);
    const profileComplete = Boolean(
      highSchool && intendedMajors && honors.length > 0
    );

    const { error: profileError } = await supabase.from("user_profiles").upsert(
      {
        user_id: currentUser.id,
        high_school: highSchool,
        intended_majors: intendedMajors,
        profile_complete: profileComplete,
      },
      { onConflict: "user_id" }
    );

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { error: deleteHonorsError } = await supabase.from("user_honors").delete().eq("user_id", currentUser.id);
    const { error: deleteActivitiesError } = await supabase.from("user_activities").delete().eq("user_id", currentUser.id);

    if (deleteHonorsError) {
      throw new Error(deleteHonorsError.message);
    }

    if (deleteActivitiesError) {
      throw new Error(deleteActivitiesError.message);
    }

    if (activities.length > 0) {
      const { error: activitiesError } = await supabase.from("user_activities").insert(
        activities.map(({ id: _activityId, ...activity }) => ({
          user_id: currentUser.id,
          ...activity,
        }))
      );

      if (activitiesError) {
        throw new Error(activitiesError.message);
      }
    }

    if (honors.length > 0) {
      const { error: honorsError } = await supabase.from("user_honors").insert(
        honors.map(({ id: _honorId, ...honor }) => ({
          user_id: currentUser.id,
          ...honor,
        }))
      );

      if (honorsError) {
        throw new Error(honorsError.message);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/profile");
    redirect("/profile");
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">Profile</p>
          <h1 className="mt-1 text-2xl font-semibold">Build your application profile</h1>
        </div>
        <Link href="/dashboard" className="rounded-full border border-border-soft px-4 py-2 text-sm">
          Back to Dashboard
        </Link>
      </div>

      <ProfileForm
        initialHighSchool={profile.highSchool}
        initialMajors={profile.intendedMajors}
        initialActivities={profile.activities}
        initialHonors={profile.honors}
        saveAction={saveProfile}
        deleteActivityAction={deleteActivity}
        deleteHonorAction={deleteHonor}
      />
    </main>
  );
}
