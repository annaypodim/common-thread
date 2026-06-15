import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type DeadlineSuggestion = {
  label: string;
  due_date: string; // ISO date (YYYY-MM-DD)
  source_url: string; // a page the web search actually crawled ("" if unverified)
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Normalize a URL for comparison so a model-supplied link matches the crawled
// one despite trailing slashes / host casing.
function canonicalUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    return `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, "")}${u.search}`;
  } catch {
    return "";
  }
}

// Collect the real URLs the web_search tool actually fetched. These are pages
// that genuinely exist and were retrieved seconds ago, so they are safe to link
// to. Returns a map of canonical -> the real crawled URL.
function collectCrawledUrls(content: Anthropic.ContentBlock[]): Map<string, string> {
  const urls = new Map<string, string>();
  for (const block of content) {
    if (block.type !== "web_search_tool_result") continue;
    const results = block.content;
    if (!Array.isArray(results)) continue; // skip error blocks
    for (const r of results) {
      if (r.type === "web_search_result" && typeof r.url === "string") {
        const canon = canonicalUrl(r.url);
        if (canon && !urls.has(canon)) urls.set(canon, r.url);
      }
    }
  }
  return urls;
}

function parseSuggestions(
  text: string,
  crawledUrls: Map<string, string>
): DeadlineSuggestion[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response");

  const parsed = JSON.parse(match[0]) as { deadlines?: unknown };
  if (!Array.isArray(parsed.deadlines)) return [];

  return parsed.deadlines
    .filter(
      (d): d is Record<string, unknown> =>
        Boolean(d) &&
        typeof (d as DeadlineSuggestion).label === "string" &&
        typeof (d as DeadlineSuggestion).due_date === "string" &&
        ISO_DATE.test((d as DeadlineSuggestion).due_date)
    )
    .map((d) => {
      // Only trust a source link if the search engine actually crawled it.
      // Anything the model invented (not in the result set) is dropped, so the
      // "Verify" link can never be a dead/hallucinated URL.
      const canon = typeof d.source_url === "string" ? canonicalUrl(d.source_url) : "";
      return {
        label: (d.label as string).trim(),
        due_date: d.due_date as string,
        source_url: (canon && crawledUrls.get(canon)) || "",
      };
    });
}

/**
 * Uses Claude's web search tool to find application deadlines for the upcoming
 * admissions cycle for a given college. Returns concrete ISO dates the user can
 * confirm or edit, each linked to a page the search actually crawled so the
 * student can verify it. Best-effort: returns [] if nothing reliable is found.
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

For "source_url", you MUST copy the exact URL of a page you actually opened in your web search that shows this deadline. Do not shorten, guess, or construct a URL. Prefer the college's own official (.edu) admissions/deadlines page. If none of the pages you opened confirm a given deadline, use an empty string for its source_url.

After searching, respond with ONLY valid JSON, no other text, in this exact format:
{"deadlines": [{"label": "Regular Decision", "due_date": "2027-01-01", "source_url": "https://admissions.example.edu/apply/deadlines"}, {"label": "Early Action", "due_date": "2026-11-01", "source_url": "https://admissions.example.edu/apply/deadlines"}]}

Every due_date must be a real future-facing date in YYYY-MM-DD format. If you cannot find reliable deadlines, return {"deadlines": []}.`,
      },
    ],
  });

  const crawledUrls = collectCrawledUrls(response.content);

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return parseSuggestions(text, crawledUrls);
}
