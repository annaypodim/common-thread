import { requireUser } from "@/lib/auth";
import { getUserProfileData, hasAnyProfileData } from "@/lib/profile";
import { AnalyzerClient } from "@/components/analyzer-client";
import { Sidebar } from "@/components/sidebar";
import { getSavedAnalysis } from "@/lib/analysis";

export default async function Analyzer() {
  const user = await requireUser();
  const [profile, savedResult] = await Promise.all([
    getUserProfileData(user.id),
    getSavedAnalysis(user.id),
  ]);

  return (
    <div className="flex flex-1 bg-ivory text-foreground">
      <Sidebar activePage="analyzer" profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <AnalyzerClient
          profile={profile}
          hasData={hasAnyProfileData(profile)}
          savedResult={savedResult}
        />
      </main>
    </div>
  );
}
