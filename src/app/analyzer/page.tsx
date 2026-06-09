import { requireUser } from "@/lib/auth";
import { getUserProfileData, hasAnyProfileData } from "@/lib/profile";
import { AnalyzerClient } from "@/components/analyzer-client";
import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";
import type { AnalyzeResult } from "@/app/api/analyze/route";

async function getSavedAnalysis(userId: string): Promise<AnalyzeResult | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_analyses")
    .select("result")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.result as AnalyzeResult) ?? null;
}

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
