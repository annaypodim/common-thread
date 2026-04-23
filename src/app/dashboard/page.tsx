import { requireUser } from "@/lib/auth";
import { getAllColleges, getMissingUserCollegesTableMessage, getUserSavedColleges } from "@/lib/colleges";
import { getUserProfileData, hasAnyProfileData, isProfileComplete } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { DashboardCollegeManager } from "@/components/dashboard-college-manager";

const navItems = [
  { label: "Dashboard", href: "/dashboard", active: true },
  { label: "Angle Analyzer", href: "/analyzer" },
  { label: "Essays", href: "/dashboard" },
  { label: "College Research", href: "/dashboard" },
  { label: "Academic Profile", href: "/profile" },
  { label: "Settings", href: "/dashboard" },
];

export default async function Dashboard() {
  const user = await requireUser();
  const profile = await getUserProfileData(user.id);
  const profileComplete = isProfileComplete(profile);
  const hasStartedProfile = hasAnyProfileData(profile);
  const [allColleges, savedColleges] = await Promise.all([
    getAllColleges(),
    getUserSavedColleges(user.id),
  ]);

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

  return (
    <div className="flex flex-1 bg-ivory text-foreground">
      <aside className="hidden w-72 shrink-0 border-r border-border-soft bg-white/60 px-5 py-6 md:block">
        <h1 className="mt-2 text-xl font-semibold text-foreground">Application Workspace</h1>

        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                item.active
                  ? "bg-forest text-white"
                  : "text-text-secondary hover:bg-white hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/profile"
          className={`mt-8 block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
            hasStartedProfile
              ? "border border-border-soft bg-white text-foreground hover:bg-ivory"
              : "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
          }`}
        >
          {hasStartedProfile ? "View Full Profile Plan" : "Complete Your Profile"}
        </Link>

        <div className="mt-3 rounded-2xl border border-border-soft bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-tertiary">Profile Snapshot</p>
          <p className="mt-2 text-sm text-text-secondary">School: {profile.highSchool || "Not added"}</p>
          <p className="mt-1 text-sm text-text-secondary">Intended major: {profile.intendedMajors || "Not added"}</p>
          <p className="mt-1 text-sm text-text-secondary">Activities: {profile.activities.length} listed</p>
          <p className="mt-1 text-sm text-text-secondary">Awards: {profile.honors.length} listed</p>
        </div>
      </aside>

      <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
        {!hasStartedProfile && (
          <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-700">
              Your profile is incomplete. Fill in your high school, intended majors, activities, and honors to unlock a complete dashboard snapshot.
            </p>
            <Link
              href="/profile"
              className="inline-flex w-fit rounded-full bg-red-100 px-4 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-200"
            >
              Complete Profile
            </Link>
          </div>
        )}

        <div className="rounded-2xl border border-border-soft bg-white/90 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">Dashboard</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Welcome back, {user.user_metadata?.full_name?.split(" ")[0] ?? "Student"}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {profileComplete
              ? "Your profile snapshot is complete and ready to support college planning."
              : "Finish your profile to personalize each saved college workspace even more."}
          </p>
        </div>

        <DashboardCollegeManager
          colleges={allColleges}
          initialSavedColleges={savedColleges}
          defaultIntendedMajor={profile.intendedMajors}
          addCollegeAction={addCollege}
        />
      </main>
    </div>
  );
}
