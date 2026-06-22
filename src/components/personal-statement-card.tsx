import Link from "next/link";
import {
  countWords,
  type PersonalStatementDraft,
  type PersonalStatementStatus,
} from "@/lib/personal-statement-types";

const statusLabels: Record<PersonalStatementStatus, string> = {
  not_started: "Not started",
  drafting: "Drafting",
  needs_revision: "Needs revision",
  complete: "Complete",
};

export function PersonalStatementCard({ draft }: { draft: PersonalStatementDraft }) {
  const wordCount = countWords(draft.content);
  const lastEdited = draft.updatedAt
    ? new Date(draft.updatedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Not yet edited";

  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-border-soft bg-white p-4 sm:p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sage">
          Main college essay
        </p>
        <h3 className="mt-1 text-lg font-semibold">Personal Statement</h3>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
          Draft your main college essay using your strongest themes from the Angle Analyzer.
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-ivory/70 p-3 text-sm">
        <div>
          <dt className="text-xs text-text-tertiary">Draft status</dt>
          <dd className="mt-0.5 font-medium text-foreground">{statusLabels[draft.status]}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-tertiary">Word count</dt>
          <dd className={`mt-0.5 font-medium ${wordCount > 650 ? "text-red-600" : "text-foreground"}`}>
            {wordCount} / 650
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-text-tertiary">Last edited</dt>
          <dd className="mt-0.5 font-medium text-foreground">{lastEdited}</dd>
        </div>
      </dl>

      <Link
        href="/personal-statement"
        className="mt-4 inline-flex w-fit rounded-full bg-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light"
      >
        {draft.updatedAt ? "Continue drafting" : "Start drafting"}
      </Link>
    </article>
  );
}
