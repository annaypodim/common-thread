import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createCollegeResearchDocument,
  getCollegeResearchDocument,
  getEmptyCollegeResearchSections,
  saveCollegeResearchDocument,
  type CollegeResearchChatMessage,
  type CollegeResearchSections,
} from "@/lib/college-research";
import { requireUser } from "@/lib/auth";
import { slugifyCollege } from "@/lib/college-format";
import { getUserSavedColleges } from "@/lib/colleges";
import { getUserProfileData } from "@/lib/profile";
import { CollegeResearchWorkspace } from "@/components/college-research-workspace";

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function CollegeWorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;
  const [profile, savedColleges] = await Promise.all([
    getUserProfileData(user.id),
    getUserSavedColleges(user.id),
  ]);
  const savedCollege = savedColleges.find((college) => slugifyCollege(college.collegeName) === slug);

  if (!savedCollege) {
    notFound();
  }

  const savedCollegeId = savedCollege.id;
  const researchDocument = await getCollegeResearchDocument(user.id, savedCollege.id);

  async function createResearchDocument() {
    "use server";

    const currentUser = await requireUser();
    const userColleges = await getUserSavedColleges(currentUser.id);
    const currentCollege = userColleges.find((college) => college.id === savedCollegeId);

    if (!currentCollege) {
      return { error: "This college is no longer saved to your dashboard." };
    }

    try {
      const document = await createCollegeResearchDocument(currentUser.id, currentCollege.id);
      revalidatePath(`/colleges/${slug}`);
      return { document };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to create research document." };
    }
  }

  async function saveResearchDocument(
    sections: CollegeResearchSections,
    chatMessages: CollegeResearchChatMessage[],
    status: "drafting" | "complete"
  ) {
    "use server";

    const currentUser = await requireUser();
    const userColleges = await getUserSavedColleges(currentUser.id);
    const currentCollege = userColleges.find((college) => college.id === savedCollegeId);

    if (!currentCollege) {
      return { error: "This college is no longer saved to your dashboard." };
    }

    try {
      const document = await saveCollegeResearchDocument({
        userId: currentUser.id,
        userCollegeId: currentCollege.id,
        sections: sections ?? getEmptyCollegeResearchSections(),
        chatMessages: chatMessages ?? [],
        status,
      });
      revalidatePath(`/colleges/${slug}`);
      return { document };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to save research document." };
    }
  }

  return (
    <div className="flex flex-1 bg-ivory px-4 py-6 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-6xl space-y-5">
        <section className="rounded-2xl border border-border-soft bg-white p-5 sm:p-6">
          <Link href="/dashboard" className="text-sm font-medium text-forest hover:text-forest-light">
            Back to Dashboard
          </Link>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">College Workspace</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {toTitleCase(savedCollege.collegeName)}
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                {[savedCollege.city && toTitleCase(savedCollege.city), savedCollege.state].filter(Boolean).join(", ") ||
                  "Location not saved"}
              </p>
            </div>
            <div className="rounded-xl border border-border-soft bg-ivory/70 px-4 py-3 text-sm text-text-secondary">
              Intended major: <span className="font-medium text-foreground">{savedCollege.intendedMajor || profile.intendedMajors || "Not set"}</span>
            </div>
          </div>
        </section>

        <CollegeResearchWorkspace
          college={savedCollege}
          profile={profile}
          initialDocument={researchDocument}
          createResearchDocumentAction={createResearchDocument}
          saveResearchDocumentAction={saveResearchDocument}
        />
      </main>
    </div>
  );
}
