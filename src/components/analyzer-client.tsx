"use client";

import { useState, useEffect, useRef } from "react";
import type { UserProfileData } from "@/lib/profile";
import type { AnalyzeResult, NarrativeAngle } from "@/app/api/analyze/route";
import Link from "next/link";

const STEPS = [
  { label: "Extracting themes from your activities", duration: 4000 },
  { label: "Clustering and ranking your narrative strengths", duration: 4000 },
  { label: "Building your application angles", duration: 5000 },
];

function ProfileSummaryCard({ profile }: { profile: UserProfileData }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border-soft bg-white p-4 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-tertiary">
        What we&rsquo;ll analyze
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-2xl font-semibold text-foreground">
            {profile.activities.length}
          </p>
          <p className="mt-0.5 text-sm text-text-secondary">Activities</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-foreground">
            {profile.honors.length}
          </p>
          <p className="mt-0.5 text-sm text-text-secondary">Honors & Awards</p>
        </div>
        <div className="col-span-2 min-w-0">
          <p className="break-words text-sm font-medium text-foreground sm:truncate">
            {profile.intendedMajors || (
              <span className="text-text-tertiary italic">No major listed</span>
            )}
          </p>
          <p className="mt-0.5 text-sm text-text-secondary">Intended Major(s)</p>
        </div>
      </div>
      {profile.highSchool && (
        <p className="mt-4 text-sm text-text-secondary border-t border-border-soft pt-4">
          {profile.highSchool}
        </p>
      )}
    </div>
  );
}

function LoadingSteps({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex flex-col gap-3">
      {STEPS.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div
            key={step.label}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-500 ${
              active
                ? "bg-forest text-white"
                : done
                ? "bg-white border border-border-soft text-text-secondary"
                : "opacity-40 bg-white border border-border-soft text-text-tertiary"
            }`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {done ? (
                <svg viewBox="0 0 16 16" className="h-4 w-4 text-sage" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <polyline points="2.5,8 6.5,12 13.5,4" />
                </svg>
              ) : (
                <span className={active ? "text-white/70" : ""}>{i + 1}</span>
              )}
            </span>
            <span className="text-sm font-medium">{step.label}</span>
            {active && (
              <span className="ml-auto flex gap-1">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce"
                    style={{ animationDelay: `${dot * 0.15}s` }}
                  />
                ))}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AngleCard({ angle, rank }: { angle: NarrativeAngle; rank: number }) {
  const isTop = rank === 0;
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div
      className={`min-w-0 rounded-2xl px-4 py-5 sm:px-5 sm:py-6 ${
        isTop ? "bg-forest text-white" : "border border-border-soft bg-white"
      }`}
    >
      {/* Badge */}
      <span
        className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide mb-3 ${
          isTop ? "bg-white/20 text-white/80" : "bg-background text-text-tertiary"
        }`}
      >
        {isTop ? "Strongest Angle" : `Alternative #${rank + 1}`}
      </span>

      {/* Title */}
      <h3
        className={`break-words text-2xl font-semibold font-serif ${
          isTop ? "text-white" : "text-foreground"
        }`}
      >
        {angle.title}
      </h3>

      {/* Major pill */}
      <div className={`mt-3 flex max-w-full items-center rounded-2xl px-4 py-1.5 sm:inline-flex sm:rounded-full ${
        isTop ? "bg-white/15 border border-white/25" : "bg-sage/10 border border-sage/25"
      }`}>
        <span className={`min-w-0 break-words text-sm font-semibold ${isTop ? "text-white" : "text-forest"}`}>
          {angle.major_connection}
        </span>
      </div>

      {/* Essay ideas — primary content */}
      {angle.essay_prompts?.length > 0 && (
        <div className="mt-6">
          <p className={`text-xs font-semibold uppercase tracking-[0.12em] mb-3 ${isTop ? "text-white/50" : "text-text-tertiary"}`}>
            Essay Ideas for This Angle
          </p>
          <ul className="flex flex-col gap-3">
            {angle.essay_prompts.map((prompt, i) => (
              <li key={i} className={`flex items-start gap-3 rounded-xl p-4 ${isTop ? "bg-white/10" : "bg-background"}`}>
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isTop ? "bg-white/20 text-white" : "bg-border-soft text-text-secondary"
                }`}>
                  {i + 1}
                </span>
                <p className={`min-w-0 break-words text-sm leading-relaxed ${isTop ? "text-white/85" : "text-text-secondary"}`}>
                  {prompt}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Why it stands out */}
      <div className={`mt-4 rounded-xl p-4 ${isTop ? "bg-white/10" : "bg-background"}`}>
        <p className={`text-xs font-semibold uppercase tracking-[0.12em] mb-1.5 ${isTop ? "text-white/50" : "text-text-tertiary"}`}>
          Why It Stands Out
        </p>
        <p className={`text-sm leading-relaxed ${isTop ? "text-white/85" : "text-text-secondary"}`}>
          {angle.standout_reason}
        </p>
      </div>

      {/* Collapsible: summary, evidence, skills */}
      <div className="mt-4">
        <button
          onClick={() => setDetailsOpen((o) => !o)}
          className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
            isTop
              ? "bg-white/10 text-white/70 hover:bg-white/15"
              : "bg-background text-text-secondary hover:bg-border-soft"
          }`}
        >
          <span>Additional details</span>
          <svg
            viewBox="0 0 16 16"
            className={`h-4 w-4 transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <polyline points="3,6 8,11 13,6" />
          </svg>
        </button>

        {detailsOpen && (
          <div className="mt-3 flex flex-col gap-4">
            {/* Summary */}
            <p className={`text-sm leading-relaxed px-1 ${isTop ? "text-white/80" : "text-text-secondary"}`}>
              {angle.summary}
            </p>

            {/* Evidence + Skills */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.12em] mb-2 ${isTop ? "text-white/50" : "text-text-tertiary"}`}>
                  Supporting Evidence
                </p>
                <ul className="flex flex-col gap-2">
                  {angle.evidence.map((e) => (
                    <li key={e} className={`flex items-start gap-2.5 text-sm ${isTop ? "text-white/80" : "text-text-secondary"}`}>
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sage" />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.12em] mb-2 ${isTop ? "text-white/50" : "text-text-tertiary"}`}>
                  Skills Demonstrated
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {angle.skills.map((s) => (
                    <span
                      key={s}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        isTop ? "bg-white/15 text-white" : "bg-background text-foreground"
                      }`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AnalyzerClient({
  profile,
  hasData,
  savedResult,
  runsRemaining,
  runsLimit,
  isSignedIn,
}: {
  profile: UserProfileData;
  hasData: boolean;
  savedResult: AnalyzeResult | null;
  runsRemaining: number;
  runsLimit: number;
  isSignedIn: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    savedResult ? "done" : "idle"
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<AnalyzeResult | null>(savedResult);
  const [errorMsg, setErrorMsg] = useState("");
  const [remaining, setRemaining] = useState(runsRemaining);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const outOfRuns = remaining <= 0;

  function advanceStep(step: number) {
    if (step >= STEPS.length - 1) return;
    stepTimerRef.current = setTimeout(() => {
      setCurrentStep(step + 1);
      advanceStep(step + 1);
    }, STEPS[step].duration);
  }

  async function runAnalysis() {
    // Guests can't run the analyzer — the UI should route them to sign-in
    // rather than here, but guard anyway.
    if (!isSignedIn) return;

    // Guard client-side too, so a used-up user never fires a doomed request.
    if (outOfRuns) {
      setShowLimitModal(true);
      return;
    }

    setStatus("loading");
    setCurrentStep(0);
    setResult(null);
    setErrorMsg("");
    advanceStep(0);

    try {
      const res = await fetch("/api/analyze", { method: "POST" });
      const data = await res.json();

      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);

      if (res.status === 429 || data.error === "out_of_runs") {
        setRemaining(0);
        setShowLimitModal(true);
        setStatus(result ? "done" : "idle");
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }

      // A run was successfully consumed on the server.
      setRemaining((r) => Math.max(0, r - 1));
      setCurrentStep(STEPS.length);
      setResult(data as AnalyzeResult);
      setStatus("done");
    } catch {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, []);

  const analyzedAt = result?.analyzed_at
    ? new Date(result.analyzed_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-w-0 px-4 py-6 sm:px-8 sm:py-10 lg:px-16">
      <div className="mx-auto min-w-0 max-w-3xl">
        <div className="animate-fade-up">
          <h1 className="break-words text-3xl font-semibold font-serif text-foreground">
            Application Angle Analyzer
          </h1>
          <p className="mt-2 text-text-secondary">
            We&rsquo;ll read your full profile and surface the 2-3 strongest
            narrative angles for your college applications.
          </p>
        </div>

        {!hasData && (
          <div className="mt-6 flex flex-col items-stretch gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
            <p className="text-sm text-red-800">
              Your profile is empty. Add activities and honors first so we have
              something to analyze.
            </p>
            <Link
              href="/activity-lists"
              className="shrink-0 rounded-xl bg-red-800 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Add activities
            </Link>
          </div>
        )}

        <div className="mt-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <ProfileSummaryCard profile={profile} />
        </div>

        {status === "idle" && (
          <div className="mt-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            {isSignedIn ? (
              <>
                <button
                  onClick={runAnalysis}
                  disabled={!hasData || outOfRuns}
                  className="w-full rounded-2xl bg-forest px-6 py-4 text-base font-semibold text-white transition-all hover:bg-forest-light disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Analyze my application
                </button>
                <p className="mt-3 text-center text-xs text-text-tertiary">
                  {outOfRuns
                    ? "You're out of runs for this month. Come back soon!"
                    : `${remaining} of ${runsLimit} runs left this month`}
                </p>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="block w-full rounded-2xl bg-forest px-6 py-4 text-center text-base font-semibold text-white transition-all hover:bg-forest-light"
                >
                  Sign in to run the analyzer
                </Link>
                <p className="mt-3 text-center text-xs text-text-tertiary">
                  Sign in with Google to analyze your application.
                </p>
              </>
            )}
          </div>
        )}

        {status === "loading" && (
          <div className="mt-8 animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-tertiary mb-4">
              Running analysis
            </p>
            <LoadingSteps currentStep={currentStep} />
          </div>
        )}

        {status === "error" && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm text-red-800">{errorMsg}</p>
            <button
              onClick={runAnalysis}
              className="mt-3 rounded-xl bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {status === "done" && result && (
          <div className="mt-10 flex flex-col gap-5 animate-fade-up">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-tertiary">
                  Your narrative angles — ranked
                </p>
                {analyzedAt && (
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    Last analyzed {analyzedAt}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <button
                  onClick={runAnalysis}
                  className="text-sm text-text-secondary hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Re-analyze
                </button>
                <span className="text-xs text-text-tertiary">
                  {outOfRuns
                    ? "No runs left this month"
                    : `${remaining} of ${runsLimit} runs left`}
                </span>
              </div>
            </div>
            {result.angles.map((angle, i) => (
              <AngleCard key={angle.title} angle={angle} rank={i} />
            ))}
          </div>
        )}
      </div>

      {showLimitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowLimitModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage/15">
              <span className="text-2xl" aria-hidden>
                🌱
              </span>
            </div>
            <h2 className="mt-4 text-xl font-semibold font-serif text-foreground">
              Out of re-runs
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              You&rsquo;ve used all {runsLimit} analyzer runs for this month.
              Come back soon!
            </p>
            <button
              onClick={() => setShowLimitModal(false)}
              className="mt-5 w-full rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
