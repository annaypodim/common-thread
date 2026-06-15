import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type DeadlineSuggestion = {
  label: string;
  due_date: string; // ISO date (YYYY-MM-DD)
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseSuggestions(text: string): DeadlineSuggestion[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response");

  const parsed = JSON.parse(match[0]) as { deadlines?: unknown };
  if (!Array.isArray(parsed.deadlines)) return [];

  return parsed.deadlines
    .filter(
      (d): d is DeadlineSuggestion =>
        Boolean(d) &&
        typeof (d as DeadlineSuggestion).label === "string" &&
        typeof (d as DeadlineSuggestion).due_date === "string" &&
        ISO_DATE.test((d as DeadlineSuggestion).due_date)
    )
    .map((d) => ({ label: d.label.trim(), due_date: d.due_date }));
}

/**
 * Uses Claude's web search tool to find application deadlines for the upcoming
 * admissions cycle for a given college. Returns concrete ISO dates the user can
 * confirm or edit. Best-effort: returns [] if nothing reliable is found.
 */
export async function lookupCollegeDeadlines(
  collegeName: string
): Promise<DeadlineSuggestion[]> {
  const today = new Date().toISOString().slice(0, 10);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
    messages: [
      {
        role: "user",
        content: `Today's date is ${today}. Find the undergraduate application deadlines for "${collegeName}" for the NEXT upcoming admissions cycle (the deadlines a student applying now would face). Search the college's official admissions website for current dates.

Include each applicable round: Early Decision, Early Decision II, Early Action, Restrictive/Single-Choice Early Action, and Regular Decision. Only include rounds this college actually offers. Use the exact calendar dates published for the upcoming cycle. If only the prior year's date is available, estimate the upcoming date based on the college's consistent pattern and keep the label.

After searching, respond with ONLY valid JSON, no other text, in this exact format:
{"deadlines": [{"label": "Regular Decision", "due_date": "2027-01-01"}, {"label": "Early Action", "due_date": "2026-11-01"}]}

Every due_date must be a real future-facing date in YYYY-MM-DD format. If you cannot find reliable deadlines, return {"deadlines": []}.`,
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return parseSuggestions(text);
}
