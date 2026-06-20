"use client";

import { useState } from "react";
import Link from "next/link";
import type { AnalyzeResult } from "@/app/api/analyze/route";

export function DashboardAngleAnalyzer({
  savedResult,
}: {
  savedResult: AnalyzeResult | null;
}) {
  const [result, setResult] = useState<AnalyzeResult | null>(savedResult);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function runAnalysis() {
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/analyze", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }

      setResult(data as AnalyzeResult);
      setStatus("idle");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  const topAngle = result?.angles?.[0] ?? null;
  const analyzedAt = result?.analyzed_at
    ? new Date(result.analyzed_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <article className="min-w-0 rounded-2xl bg-forest p-4 text-white sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Angle Analyzer Snapshot</h3>
          {analyzedAt ? (
            <p className="mt-1 text-sm text-white/70">
              Last analyzed {analyzedAt}
            </p>
          ) : (
            <p className="mt-1 text-sm text-white/70">
              Haven&apos;t found your angle yet.
            </p>
          )}
        </div>
        {!result && (
          <button
            type="button"
            onClick={runAnalysis}
            disabled={status === "loading"}
            className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? "Analyzing..." : "Run Angle Analyzer"}
          </button>
        )}
      </div>

      {status === "error" && (
        <p className="mt-3 text-sm text-red-200">{errorMsg}</p>
      )}

      {topAngle ? (
        <div className="mt-3 rounded-xl bg-white/10 px-4 py-3">
          <span className="inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-white/80">
            Strongest Angle
          </span>
          <div className="mt-2 flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-stretch sm:gap-3">
            <h4 className="min-w-0 break-words text-xl font-semibold font-serif">
              {topAngle.title}
            </h4>
            <div className="flex items-center rounded-full border border-white/25 bg-white/15 px-3">
              <span className="text-sm font-semibold text-white">
                {topAngle.major_connection}
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-white/85">
            {topAngle.summary}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-white/70">
          Run the analyzer to surface your strongest application angles.
        </p>
      )}

      <Link
        href="/analyzer"
        className="mt-4 inline-flex rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
      >
        Open Angle Analyzer
      </Link>
    </article>
  );
}
