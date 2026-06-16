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
  const extraAngles = result ? result.angles.length - 1 : 0;
  const analyzedAt = result?.analyzed_at
    ? new Date(result.analyzed_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <article className="rounded-2xl border border-border-soft bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Angle Analyzer Snapshot</h3>
          {analyzedAt ? (
            <p className="mt-1 text-sm text-text-secondary">
              Last analyzed {analyzedAt}
            </p>
          ) : (
            <p className="mt-1 text-sm text-text-secondary">
              Haven&apos;t found your angle yet.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={runAnalysis}
          disabled={status === "loading"}
          className="shrink-0 rounded-full bg-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading"
            ? "Analyzing..."
            : result
            ? "Re-run Angle Analyzer"
            : "Run Angle Analyzer"}
        </button>
      </div>

      {status === "error" && (
        <p className="mt-3 text-sm text-red-700">{errorMsg}</p>
      )}

      {topAngle ? (
        <div className="mt-4 rounded-xl bg-forest p-5 text-white">
          <span className="inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-white/80">
            Strongest Angle
          </span>
          <h4 className="mt-3 text-xl font-semibold font-serif">
            {topAngle.title}
          </h4>
          <div className="mt-2 inline-flex items-center rounded-full border border-white/25 bg-white/15 px-3 py-1">
            <span className="text-sm font-semibold text-white">
              {topAngle.major_connection}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/85">
            {topAngle.summary}
          </p>
          {extraAngles > 0 && (
            <p className="mt-3 text-xs text-white/60">
              +{extraAngles} more angle{extraAngles > 1 ? "s" : ""} in the full
              analyzer
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-secondary">
          Run the analyzer to surface your strongest application angles.
        </p>
      )}

      <Link
        href="/analyzer"
        className="mt-4 inline-flex rounded-full border border-border-soft px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-ivory"
      >
        Open Angle Analyzer
      </Link>
    </article>
  );
}
