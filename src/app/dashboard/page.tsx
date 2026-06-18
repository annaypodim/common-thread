import { requireUser } from "@/lib/auth";
import { getMissingUserCollegesTableMessage, getUserSavedColleges, searchColleges } from "@/lib/colleges";
import { getMissingDeadlinesTableMessage, getUserDeadlines } from "@/lib/deadlines";
import { cacheKey, getCachedDeadlinesByName, getCollegeDeadlineSuggestions } from "@/lib/deadline-cache";
import type { DeadlineSuggestion } from "@/lib/deadline-lookup";
import { getUserProfileData } from "@/lib/profile";
import { getSavedAnalysis } from "@/lib/analysis";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { DashboardCollegeManager } from "@/components/dashboard-college-manager";
import { BottomBanner } from "@/components/bottom-banner";
import { WorkspaceLayout } from "@/components/workspace-layout";

export default async function Dashboard() {
  const user = await requireUser();
  const profile = await getUserProfileData(user.id);
  const [initialCollegeSuggestions, savedColleges, savedAnalysis, savedDeadlines] = await Promise.all([
    searchColleges("", 8),
    getUserSavedColleges(user.id),
    getSavedAnalysis(user.id),
    getUserDeadlines(user.id),
  ]);

  // Seed already-cached rounds so the dashboard shows them instantly without a
  // client-side web search. Keyed by saved-college id for the component.
  const cachedByName = await getCachedDeadlinesByName(savedColleges.map((c) => c.collegeName));
  const initialDeadlineSuggestions: Record<string, DeadlineSuggestion[]> = {};
  for (const c of savedColleges) {
    const rounds = cachedByName[cacheKey(c.collegeName)];
    if (rounds) initialDeadlineSuggestions[c.id] = rounds;
  }

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

  async function lookupDeadlines(collegeName: string) {
    "use server";

    await requireUser();

    if (!process.env.ANTHROPIC_API_KEY) {
      return { error: "Deadline lookup is not configured." };
    }

    try {
      return { deadlines: await getCollegeDeadlineSuggestions(collegeName) };
    } catch (error) {
      console.error("Deadline lookup error:", error);
      return { error: "Could not look up deadlines right now. Try adding one manually." };
    }
  }

  async function saveDeadline(formData: FormData) {
    "use server";

    const currentUser = await requireUser();
    const supabase = await createClient();

    const userCollegeId = String(formData.get("userCollegeId") ?? "").trim();
    const collegeName = String(formData.get("collegeName") ?? "").trim();
    const label = String(formData.get("label") ?? "").trim();
    const dueDate = String(formData.get("dueDate") ?? "").trim();
    const rawSourceUrl = String(formData.get("sourceUrl") ?? "").trim();
    const sourceUrl = /^https?:\/\//i.test(rawSourceUrl) ? rawSourceUrl : "";

    if (!userCollegeId || !collegeName || !label || !dueDate) {
      return { error: "A college, label, and date are all required." };
    }

    const { data, error } = await supabase
      .from("user_college_deadlines")
      .upsert(
        {
          user_id: currentUser.id,
          user_college_id: userCollegeId,
          college_name: collegeName,
          label,
          due_date: dueDate,
          source_url: sourceUrl || null,
        },
        { onConflict: "user_college_id,label,due_date" }
      )
      .select("id, user_college_id, college_name, label, due_date, source_url")
      .single();

    if (error) {
      return { error: getMissingDeadlinesTableMessage(error.message) };
    }

    revalidatePath("/dashboard");

    return {
      deadline: {
        id: data.id,
        userCollegeId: data.user_college_id,
        collegeName: data.college_name,
        label: data.label,
        dueDate: data.due_date,
        sourceUrl: data.source_url ?? "",
      },
    };
  }

  async function removeDeadline(formData: FormData) {
    "use server";

    const currentUser = await requireUser();
    const supabase = await createClient();
    const deadlineId = String(formData.get("deadlineId") ?? "").trim();

    if (!deadlineId) {
      return { error: "Deadline could not be removed. Missing record id." };
    }

    const { error } = await supabase
      .from("user_college_deadlines")
      .delete()
      .eq("id", deadlineId)
      .eq("user_id", currentUser.id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/dashboard");

    return { success: true };
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-ivory text-foreground">
      <WorkspaceLayout
        activePage="dashboard"
        profile={profile}
        mainClassName="px-4 py-4 sm:px-6 sm:py-5 lg:px-8"
      >
        <DashboardCollegeManager
          initialCollegeSuggestions={initialCollegeSuggestions}
          initialSavedColleges={savedColleges}
          initialDeadlines={savedDeadlines}
          initialDeadlineSuggestions={initialDeadlineSuggestions}
          defaultIntendedMajor={profile.intendedMajors}
          savedAnalysis={savedAnalysis}
          searchCollegeOptions={searchCollegeOptions}
          addCollegeAction={addCollege}
          removeCollegeAction={removeCollege}
          lookupDeadlinesAction={lookupDeadlines}
          saveDeadlineAction={saveDeadline}
          removeDeadlineAction={removeDeadline}
        />
      </WorkspaceLayout>
      <BottomBanner />
    </div>
  );
}
