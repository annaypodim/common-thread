"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function saveProfileSnapshot(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const highSchool = String(formData.get("highSchool") ?? "").trim();
  const intendedMajors = String(formData.get("intendedMajors") ?? "").trim();

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      high_school: highSchool,
      intended_majors: intendedMajors,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/activity-lists");
  revalidatePath("/analyzer");
  revalidatePath("/personal-statement");

  return {
    profile: {
      highSchool,
      intendedMajors,
    },
  };
}
