import { requireUser } from "@/lib/auth";
import { getUserProfileData, hasAnyProfileData } from "@/lib/profile";
import { getAnalysisUsage } from "@/lib/usage";
import { AnalyzerClient } from "@/components/analyzer-client";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { getSavedAnalysis } from "@/lib/analysis";
import { SaveWorkPrompt } from "@/components/save-work-prompt";

export default async function Analyzer() {
  const user = await requireUser();
  const [profile, savedResult, usage] = await Promise.all([
    getUserProfileData(user.id),
    getSavedAnalysis(user.id),
    getAnalysisUsage(user.id),
  ]);

  const hasData = hasAnyProfileData(profile);

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-ivory text-foreground">
      <WorkspaceLayout
        activePage="analyzer"
        profile={profile}
        mainClassName="overflow-y-auto"
      >
        <AnalyzerClient
          profile={profile}
          hasData={hasData}
          savedResult={savedResult}
          runsRemaining={usage.remaining}
          runsLimit={usage.limit}
          isSignedIn={!user.is_anonymous}
        />
      </WorkspaceLayout>
      <SaveWorkPrompt
        isAnonymous={user.is_anonymous ?? false}
        show={hasData || Boolean(savedResult)}
      />
    </div>
  );
}
