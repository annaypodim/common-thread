import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileData } from "@/lib/profile";
import type { Activity, Honor } from "@/lib/profile";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ThemeItem = {
  item: string;
  type: "activity" | "honor";
  themes: string[];
};

export type Cluster = {
  name: string;
  score: number;
  supporting_items: string[];
  core_skills: string[];
  reasoning: string;
};

export type NarrativeAngle = {
  title: string;
  major_connection: string;
  summary: string;
  evidence: string[];
  skills: string[];
  standout_reason: string;
  essay_prompts: string[];
};

export type AnalyzeResult = {
  themes: ThemeItem[];
  clusters: Cluster[];
  angles: NarrativeAngle[];
  analyzed_at: string;
};

function formatActivities(activities: Activity[]) {
  return activities
    .map(
      (a, i) =>
        `${i + 1}. [${a.activity_type}] ${a.position_title} at ${a.organization}: ${a.description} (${a.avg_hours_per_week}h/week)`
    )
    .join("\n");
}

function formatHonors(honors: Honor[]) {
  return honors
    .map(
      (h, i) =>
        `${i + 1}. ${h.title} (${h.recognition_level}): ${h.achievement_description}`
    )
    .join("\n");
}

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

async function extractThemes(
  activities: Activity[],
  honors: Honor[],
  highSchool: string,
  intendedMajors: string
): Promise<ThemeItem[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are analyzing a high school student's application profile. For each activity and honor, identify 2-3 specific, concrete themes or skills it demonstrates. Think like an experienced college admissions counselor — look for depth, leadership, intellectual curiosity, and impact.

Student context:
- High School: ${highSchool || "not specified"}
- Intended Major(s): ${intendedMajors || "undecided"}

Activities:
${activities.length ? formatActivities(activities) : "None listed"}

Honors/Awards:
${honors.length ? formatHonors(honors) : "None listed"}

Return ONLY valid JSON in this exact format, no explanation:
{"themes": [{"item": "exact activity or honor name", "type": "activity", "themes": ["specific theme 1", "specific theme 2"]}]}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = parseJson<{ themes: ThemeItem[] }>(text);
  return parsed.themes;
}

async function clusterThemes(
  themes: ThemeItem[],
  intendedMajors: string
): Promise<Cluster[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are a college application strategist. Given these themes from a student's profile, identify exactly 3 major narrative clusters. Each cluster should represent a distinct, compelling storyline for a college application.

Themes extracted from their profile:
${JSON.stringify(themes, null, 2)}

Student's intended major(s): ${intendedMajors || "undecided"}

Rank clusters by strength. Consider: how many items support it, consistency, distinctiveness, and fit with intended major. Score each 0-100.

Return ONLY valid JSON, no explanation:
{"clusters": [{"name": "Short 3-5 word cluster name", "score": 85, "supporting_items": ["exact item name from themes list"], "core_skills": ["skill1", "skill2", "skill3"], "reasoning": "1-2 sentences on why this is a strong narrative cluster"}]}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = parseJson<{ clusters: Cluster[] }>(text);
  return parsed.clusters.slice(0, 3);
}

async function generateNarratives(
  clusters: Cluster[],
  intendedMajors: string,
  highSchool: string
): Promise<NarrativeAngle[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are an expert college application strategist. Based on these narrative clusters, generate 3 compelling, authentic application angle narratives — ranked strongest to weakest.

Student context:
- High School: ${highSchool || "not specified"}
- Intended Major(s): ${intendedMajors || "undecided"}

Narrative clusters (already ranked):
${JSON.stringify(clusters, null, 2)}

For each angle:
- Be specific and strategic, not generic. The student should read this and immediately see themselves in it.
- The title should feel like a headline, not a category.
- Do not use em-dashes (—) or en-dashes (–) anywhere. Use a regular hyphen (-) or rewrite the sentence instead.
- major_connection: a SHORT phrase naming the specific major(s) this angle points toward, e.g. "Environmental Science & Public Policy" or "Biomedical Engineering". Do NOT write a full sentence — just the major name(s).
- essay_prompts: 2-3 specific, thought-provoking essay prompts the student could actually write to. These should be tailored to this exact angle and feel like real supplemental or personal statement prompts. Reference concrete themes from their profile. Make them feel like a conversation starter, not a checklist.

Return ONLY valid JSON, no explanation:
{"angles": [{"title": "3-6 word punchy title e.g. 'Environmental Data Meets Civic Action'", "major_connection": "Environmental Science & Public Policy", "summary": "2-3 sentences — an authentic narrative arc that weaves their specific activities into one cohesive story. Make it feel real, not like a template.", "evidence": ["specific activity or honor name that proves this angle"], "skills": ["skill1", "skill2", "skill3", "skill4"], "standout_reason": "One sentence on what makes this angle memorable and distinctive to an admissions reader.", "essay_prompts": ["Describe a moment when your [specific work] forced you to confront [specific tension]...", "You've been at the intersection of X and Y — write about a time these pulled you in opposite directions.", "What does [core concept in this angle] mean to you, and when did your definition change?"]}]}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = parseJson<{ angles: NarrativeAngle[] }>(text);
  return parsed.angles.slice(0, 3);
}

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "API key not configured." },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const profile = await getUserProfileData(user.id);

  if (!profile.activities.length && !profile.honors.length) {
    return NextResponse.json(
      {
        error:
          "Add at least one activity or honor to your profile before running the analyzer.",
      },
      { status: 400 }
    );
  }

  try {
    const themes = await extractThemes(
      profile.activities,
      profile.honors,
      profile.highSchool,
      profile.intendedMajors
    );

    const clusters = await clusterThemes(themes, profile.intendedMajors);

    const angles = await generateNarratives(
      clusters,
      profile.intendedMajors,
      profile.highSchool
    );

    const result: AnalyzeResult = {
      themes,
      clusters,
      angles,
      analyzed_at: new Date().toISOString(),
    };

    await supabase.from("user_analyses").upsert(
      { user_id: user.id, result, analyzed_at: result.analyzed_at },
      { onConflict: "user_id" }
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("Analyze pipeline error:", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
