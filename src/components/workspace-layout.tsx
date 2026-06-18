import type { ReactNode } from "react";
import type { UserProfileData } from "@/lib/profile";
import { Sidebar } from "@/components/sidebar";

export function WorkspaceLayout({
  activePage,
  profile,
  children,
  mainClassName = "",
}: {
  activePage: string;
  profile: UserProfileData;
  children: ReactNode;
  mainClassName?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
      <Sidebar activePage={activePage} profile={profile} />
      <main className={`w-full min-w-0 flex-1 ${mainClassName}`}>
        {children}
      </main>
    </div>
  );
}
