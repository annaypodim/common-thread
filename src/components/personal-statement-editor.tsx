"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalyzeResult } from "@/app/api/analyze/route";
import {
  countWords,
  type PersonalStatementDraft,
  type PersonalStatementStatus,
} from "@/lib/personal-statement-types";

const statusOptions: { value: PersonalStatementStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "drafting", label: "Drafting" },
  { value: "needs_revision", label: "Needs revision" },
  { value: "complete", label: "Complete" },
];

export function PersonalStatementEditor({
  initialDraft,
  analysis,
}: {
  initialDraft: PersonalStatementDraft;
  analysis: AnalyzeResult | null;
}) {
  const [content, setContent] = useState(initialDraft.content);
  const [status, setStatus] = useState(initialDraft.status);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [errorMessage, setErrorMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState(initialDraft.updatedAt);
  const lastSavedRef = useRef(JSON.stringify([initialDraft.content, initialDraft.status]));

  const saveDraft = useCallback(async (nextContent: string, nextStatus: PersonalStatementStatus) => {
    const serialized = JSON.stringify([nextContent, nextStatus]);
    if (serialized === lastSavedRef.current) return;

    setSaveState("saving");
    setErrorMessage("");

    try {
      const response = await fetch("/api/personal-statement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: nextContent, status: nextStatus }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error ?? "Your draft could not be saved.");

      lastSavedRef.current = JSON.stringify([nextContent, result.status]);
      setStatus(result.status);
      setUpdatedAt(result.updatedAt);
      setSaveState("saved");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Your draft could not be saved.");
      setSaveState("error");
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void saveDraft(content, status), 700);
    return () => window.clearTimeout(timeoutId);
  }, [content, saveDraft, status]);

  const wordCount = countWords(content);
  const topAngle = analysis?.angles?.[0] ?? null;
  const alternatives = analysis?.angles?.slice(1, 3) ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage">Writing workspace</p>
        <h2 className="mt-1 font-serif text-3xl font-semibold text-foreground sm:text-4xl">Personal Statement</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-secondary sm:text-base">
          Use your narrative strategy as a compass, then draft the story in your own words. This workspace will not generate the essay for you.
        </p>
      </header>

      <section className="mt-6 rounded-2xl bg-forest p-4 text-white sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">From your latest Angle Analyzer</p>
            <h3 className="mt-1 text-xl font-semibold font-serif">Your strongest narrative guidance</h3>
          </div>
          {analysis?.analyzed_at && (
            <p className="text-xs text-white/60">
              Analyzed {new Date(analysis.analyzed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>

        {topAngle ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-xl bg-white/10 p-4">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">Strongest angle</span>
              <h4 className="mt-3 font-serif text-2xl font-semibold">{topAngle.title}</h4>
              <p className="mt-2 text-sm leading-relaxed text-white/85">{topAngle.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {topAngle.skills.map((skill) => (
                  <span key={skill} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/85">{skill}</span>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">Profile material to draw from</p>
                <ul className="mt-2 space-y-2">
                  {topAngle.evidence.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-white/85"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage" />{item}</li>
                  ))}
                </ul>
              </div>
              {topAngle.essay_prompts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">Questions to help find the story</p>
                  <ul className="mt-2 space-y-2">
                    {topAngle.essay_prompts.slice(0, 2).map((prompt) => (
                      <li key={prompt} className="rounded-lg bg-white/10 px-3 py-2 text-sm leading-relaxed text-white/85">{prompt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {alternatives.length > 0 && (
              <div className="lg:col-span-2 border-t border-white/15 pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">Other themes worth considering</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {alternatives.map((angle) => <span key={angle.title} className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/85">{angle.title}</span>)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-white/10 p-4">
            <p className="text-sm text-white/80">Run the Angle Analyzer to see your strongest themes, supporting profile material, and tailored story questions here.</p>
            <a href="/analyzer" className="mt-3 inline-flex rounded-full border border-white/30 px-4 py-2 text-sm font-medium hover:bg-white/10">Open Angle Analyzer</a>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-border-soft bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-border-soft pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label htmlFor="draft-status" className="text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">Draft status</label>
            <select
              id="draft-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as PersonalStatementStatus)}
              className="mt-1 block rounded-xl border border-border-soft bg-white px-3 py-2 text-sm font-medium outline-none focus:border-forest"
            >
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className={wordCount > 650 ? "font-semibold text-red-600" : "text-text-secondary"}>{wordCount} / 650 words</span>
            <span className={saveState === "error" ? "text-red-600" : "text-text-tertiary"}>
              {saveState === "saving" ? "Saving…" : saveState === "error" ? "Not saved" : updatedAt ? `Saved ${new Date(updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "Autosave ready"}
            </span>
          </div>
        </div>

        {errorMessage && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>}
        <label htmlFor="personal-statement-draft" className="sr-only">Personal statement draft</label>
        <textarea
          id="personal-statement-draft"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onBlur={() => void saveDraft(content, status)}
          placeholder="Start with a moment, image, question, or tension that only you could write about…"
          className="mt-4 min-h-[32rem] w-full resize-y bg-transparent font-serif text-lg leading-8 text-foreground outline-none placeholder:text-text-tertiary/70 sm:p-2 sm:text-xl sm:leading-9"
        />
        <p className="mt-3 border-t border-border-soft pt-3 text-xs leading-relaxed text-text-tertiary">
          Your draft saves automatically as you type. The 650-word target follows the standard main-essay limit; words over the limit are shown in red.
        </p>
      </section>
    </div>
  );
}
