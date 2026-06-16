import { requireUser } from "@/lib/auth";
import { getMissingUserCollegesTableMessage, getUserSavedColleges, searchColleges } from "@/lib/colleges";
import { getUserProfileData } from "@/lib/profile";
import { getSavedAnalysis } from "@/lib/analysis";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { DashboardCollegeManager } from "@/components/dashboard-college-manager";
import { Sidebar } from "@/components/sidebar";
import { BottomBanner } from "@/components/bottom-banner";

export default async function Dashboard() {
  const user = await requireUser();
  const profile = await getUserProfileData(user.id);
  const [initialCollegeSuggestions, savedColleges, savedAnalysis] = await Promise.all([
    searchColleges("", 8),
    getUserSavedColleges(user.id),
    getSavedAnalysis(user.id),
  ]);

  async function searchCollegeOptions(query: string) {
    "use server";

    await requireUser();

    try {
      return { colleges: await searchColleges(query, 8) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to search colleges right now." };
    }
  }

  async function addCollege(formData: FormData) {
    "use server";

    const currentUser = await requireUser();
    const supabase = await createClient();

    const collegeName = String(formData.get("name") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const state = String(formData.get("state") ?? "").trim();
    const zip = String(formData.get("zip") ?? "").trim();
    const website = String(formData.get("website") ?? "").trim();
    const intendedMajor = String(formData.get("intendedMajor") ?? "").trim();

    if (!collegeName) {
      return { error: "Please select a college from the list." };
    }

    const { data, error } = await supabase
      .from("user_colleges")
      .upsert(
        {
          user_id: currentUser.id,
          college_name: collegeName,
          state,
          intended_major: intendedMajor,
          address,
          city,
          zip,
          website,
        },
        { onConflict: "user_id,college_name,state" }
      )
      .select("id, college_name, state, intended_major, address, city, zip, website")
      .single();

    if (error) {
      return { error: getMissingUserCollegesTableMessage(error.message) };
    }

    revalidatePath("/dashboard");

    return {
      savedCollege: {
        id: data.id,
        collegeName: data.college_name,
        state: data.state ?? "",
        intendedMajor: data.intended_major ?? "",
        address: data.address ?? "",
        city: data.city ?? "",
        zip: data.zip ?? "",
        website: data.website ?? "",
      },
    };
  }

  async function removeCollege(formData: FormData) {
    "use server";

    const currentUser = await requireUser();
    const supabase = await createClient();
    const savedCollegeId = String(formData.get("savedCollegeId") ?? "").trim();

    if (!savedCollegeId) {
      return { error: "College could not be removed. Missing record id." };
    }

    const { error } = await supabase
      .from("user_colleges")
      .delete()
      .eq("id", savedCollegeId)
      .eq("user_id", currentUser.id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/dashboard");

    return { success: true };
  }

  return (
    <div className="flex flex-1 flex-col bg-ivory text-foreground">
      <div className="flex flex-1">
        <Sidebar activePage="dashboard" profile={profile} />

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <DashboardCollegeManager
            initialCollegeSuggestions={initialCollegeSuggestions}
            initialSavedColleges={savedColleges}
            defaultIntendedMajor={profile.intendedMajors}
            savedAnalysis={savedAnalysis}
            searchCollegeOptions={searchCollegeOptions}
            addCollegeAction={addCollege}
            removeCollegeAction={removeCollege}
          />
        </main>
      </div>
      <BottomBanner />
    </div>
  );
}
