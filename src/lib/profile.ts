import { createClient } from "@/lib/supabase/server";

export type Activity = {
  id?: string;
  activity_type: string;
  position_title: string;
  organization: string;
  description: string;
  grade_9: boolean;
  grade_10: boolean;
  grade_11: boolean;
  grade_12: boolean;
  avg_hours_per_week: string;
  avg_weeks_per_year: string;
};

export type Honor = {
  id?: string;
  title: string;
  grade_9: boolean;
  grade_10: boolean;
  grade_11: boolean;
  grade_12: boolean;
  recognition_level: string;
  eligibility_requirements: string;
  achievement_description: string;
};

export type UserProfileData = {
  highSchool: string;
  intendedMajors: string;
  activities: Activity[];
  honors: Honor[];
  profileComplete: boolean;
};

export async function getUserProfileData(userId: string): Promise<UserProfileData> {
  const supabase = await createClient();

  const [{ data: profile }, { data: activities }, { data: honors }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("high_school, intended_majors, profile_complete")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_activities")
      .select(
        "id, activity_type, position_title, organization, description, grade_9, grade_10, grade_11, grade_12, avg_hours_per_week, avg_weeks_per_year"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("user_honors")
      .select(
        "id, title, grade_9, grade_10, grade_11, grade_12, recognition_level, eligibility_requirements, achievement_description"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  return {
    highSchool: profile?.high_school ?? "",
    intendedMajors: profile?.intended_majors ?? "",
    activities: (activities as Activity[] | null) ?? [],
    honors: (honors as Honor[] | null) ?? [],
    profileComplete: profile?.profile_complete ?? false,
  };
}

export function isProfileComplete(profile: UserProfileData) {
  return profile.profileComplete;
}

export function hasAnyProfileData(profile: UserProfileData) {
  return Boolean(
    profile.highSchool.trim() ||
      profile.intendedMajors.trim() ||
      profile.honors.length > 0 ||
      profile.activities.length > 0
  );
}
