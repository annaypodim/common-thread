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
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-white px-4 py-2 text-sm font-medium text-forest transition-colors hover:bg-ivory hover:text-forest-light"
        >
          <span aria-hidden>←</span> Back to Dashboard
        </Link>

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
