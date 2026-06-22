import { requireUser } from "@/lib/auth";
import { getSavedAnalysis } from "@/lib/analysis";
import { getUserProfileData } from "@/lib/profile";
import { getPersonalStatementDraft } from "@/lib/personal-statement";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { PersonalStatementEditor } from "@/components/personal-statement-editor";
import { SaveWorkPrompt } from "@/components/save-work-prompt";

export default async function PersonalStatementPage() {
  const user = await requireUser();
  const [profile, analysis, draft] = await Promise.all([
    getUserProfileData(user.id),
    getSavedAnalysis(user.id),
    getPersonalStatementDraft(user.id),
  ]);

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-ivory text-foreground">
      <WorkspaceLayout activePage="personal-statement" profile={profile} mainClassName="overflow-y-auto">
        <PersonalStatementEditor initialDraft={draft} analysis={analysis} />
      </WorkspaceLayout>
      <SaveWorkPrompt isAnonymous={user.is_anonymous ?? false} show={Boolean(draft.content)} />
    </div>
  );
}
