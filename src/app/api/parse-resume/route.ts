import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { MAX_RESUME_PARSES } from "@/lib/usage";
import type { Activity, Honor } from "@/lib/profile";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_TEXT_CHARS = 15000;
const MAX_ITEMS = 30;

function stripEmDashes(text: string): string {
  return text.replace(/—/g, "-").replace(/–/g, "-");
}

function sanitizeResult(obj: unknown): unknown {
  if (typeof obj === "string") return stripEmDashes(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeResult);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, sanitizeResult(v)])
    );
  }
  return obj;
}

function parseJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response");
  return sanitizeResult(JSON.parse(match[0])) as T;
}

function asBool(value: unknown): boolean {
  return value === true || value === "true";
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const ACTIVITY_TYPES = [
  "Educational Preparation Program",
  "Extracurricular Activity",
  "Other Coursework",
  "Volunteer/Community Service",
  "Work Experience",
];
const RECOGNITION_LEVELS = ["School", "State", "National", "International"];

// Snap to an allowed <select> value so the form dropdown is never invalid.
// Empty stays empty (avoids creating phantom items); unknown non-empty -> fallback.
function oneOf(value: unknown, allowed: string[], fallback: string): string {
  const text = asText(value);
  if (!text) return "";
  return allowed.includes(text) ? text : fallback;
}

// Resumes rarely state hours/weeks; keep as a numeric-looking string or "".
function asNumericString(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") {
    const match = value.match(/\d+(\.\d+)?/);
    return match ? match[0] : "";
  }
  return "";
}

function coerceActivities(raw: unknown): Activity[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_ITEMS)
    .map((item) => {
      const a = (item ?? {}) as Record<string, unknown>;
      return {
        activity_type: oneOf(a.activity_type, ACTIVITY_TYPES, "Extracurricular Activity"),
        position_title: asText(a.position_title),
        organization: asText(a.organization),
        description: asText(a.description),
        grade_9: asBool(a.grade_9),
        grade_10: asBool(a.grade_10),
        grade_11: asBool(a.grade_11),
        grade_12: asBool(a.grade_12),
        avg_hours_per_week: asNumericString(a.avg_hours_per_week),
        avg_weeks_per_year: asNumericString(a.avg_weeks_per_year),
      } satisfies Activity;
    })
    .filter(
      (a) => a.activity_type || a.position_title || a.organization || a.description
    );
}

function coerceHonors(raw: unknown): Honor[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_ITEMS)
    .map((item) => {
      const h = (item ?? {}) as Record<string, unknown>;
      return {
        title: asText(h.title),
        grade_9: asBool(h.grade_9),
        grade_10: asBool(h.grade_10),
        grade_11: asBool(h.grade_11),
        grade_12: asBool(h.grade_12),
        recognition_level: oneOf(h.recognition_level, RECOGNITION_LEVELS, "School"),
        eligibility_requirements: asText(h.eligibility_requirements),
        achievement_description: asText(h.achievement_description),
      } satisfies Honor;
    })
    .filter((h) => h.title || h.achievement_description || h.eligibility_requirements);
}

async function extractPdfText(file: File): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

const PROMPT = (resume: string) => `You are extracting a high school student's extracurricular activities and honors/awards from their resume text, to pre-fill an application profile. The student will review and edit everything, so accuracy and preserving their original detail matters more than polish.

Resume text:
"""
${resume}
"""

Map the content into this exact JSON shape:
{
  "activities": [
    {
      "activity_type": "EXACTLY one of: 'Educational Preparation Program', 'Extracurricular Activity', 'Other Coursework', 'Volunteer/Community Service', 'Work Experience' (use 'Extracurricular Activity' if unsure)",
      "position_title": "their role, e.g. 'Founder', 'President', 'Member', 'Intern'",
      "organization": "the club / company / program name",
      "description": "what they did and accomplished, in their own words copied as closely as possible from the resume",
      "grade_9": false, "grade_10": false, "grade_11": false, "grade_12": false,
      "avg_hours_per_week": "",
      "avg_weeks_per_year": ""
    }
  ],
  "honors": [
    {
      "title": "name of the award/honor",
      "grade_9": false, "grade_10": false, "grade_11": false, "grade_12": false,
      "recognition_level": "EXACTLY one of: 'School', 'State', 'National', 'International' (best guess, else 'School')",
      "eligibility_requirements": "",
      "achievement_description": "what the award was for, copied closely from the resume"
    }
  ]
}

Rules:
- Copy the student's wording for descriptions; do NOT rewrite, embellish, or invent achievements.
- Never fabricate an organization, title, or award that is not in the text. If a field is unknown, use "".
- Leave avg_hours_per_week and avg_weeks_per_year as "" unless the resume explicitly states them.
- Set grade booleans to true ONLY when a year or grade clearly maps to a school year; otherwise leave all four false. Do not guess.
- Do not use em-dashes or en-dashes; use a regular hyphen.
- Skip pure education entries (GPA, coursework, test scores) and skills lists; only extract activities and honors.

Return ONLY the JSON, no explanation.`;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API key not configured." }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Anonymous/guest sessions don't count as "signed in" — block them so they
  // can't burn tokens (and can't reset their quota by clearing cookies).
  if (user.is_anonymous) {
    return NextResponse.json(
      { error: "not_signed_in", message: "Sign in to import a resume." },
      { status: 401 }
    );
  }

  let resumeText = "";

  try {
    const formData = await request.formData();
    const pasted = formData.get("text");
    const file = formData.get("file");

    if (typeof pasted === "string" && pasted.trim()) {
      resumeText = pasted;
    } else if (file instanceof File) {
      if (file.type !== "application/pdf") {
        return NextResponse.json(
          { error: "Please upload a PDF file or paste your resume text." },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "That PDF is too large (max 5 MB)." },
          { status: 400 }
        );
      }
      resumeText = await extractPdfText(file);
    } else {
      return NextResponse.json(
        { error: "Upload a PDF or paste your resume text to import." },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("Resume extraction error:", err);
    return NextResponse.json(
      { error: "Could not read that file. Try pasting your resume text instead." },
      { status: 400 }
    );
  }

  resumeText = resumeText.trim();

  if (!resumeText) {
    return NextResponse.json(
      {
        error:
          "No text could be read from that PDF (it may be a scan or image). Please paste your resume text instead.",
      },
      { status: 422 }
    );
  }

  resumeText = resumeText.slice(0, MAX_TEXT_CHARS);

  // Reserve one parse for this month before spending any tokens. Atomic in the
  // DB, so rapid re-submits can't slip past the quota.
  const { data: parseCount, error: usageError } = await supabase.rpc(
    "consume_resume_parse",
    { max_parses: MAX_RESUME_PARSES }
  );

  if (usageError) {
    console.error("consume_resume_parse error:", usageError);
    const notSetUp = /consume_resume_parse|schema cache|function/i.test(
      usageError.message ?? ""
    );
    return NextResponse.json(
      {
        error: notSetUp
          ? "Usage tracking is not set up yet. Run supabase/resume_deadline_rate_limit_schema.sql in Supabase."
          : "Could not verify your usage. Please try again.",
      },
      { status: 500 }
    );
  }

  if (parseCount === -1) {
    return NextResponse.json(
      {
        error: "out_of_parses",
        message: `You've used all ${MAX_RESUME_PARSES} resume imports for this month.`,
      },
      { status: 429 }
    );
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [{ role: "user", content: PROMPT(resumeText) }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = parseJson<{ activities?: unknown; honors?: unknown }>(text);

    const activities = coerceActivities(parsed.activities);
    const honors = coerceHonors(parsed.honors);

    if (!activities.length && !honors.length) {
      return NextResponse.json(
        {
          error:
            "We couldn't find any activities or honors in that resume. Try pasting the relevant sections instead.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ activities, honors });
  } catch (err) {
    console.error("Resume parse pipeline error:", err);
    return NextResponse.json(
      { error: "Import failed. Please try again." },
      { status: 500 }
    );
  }
}
