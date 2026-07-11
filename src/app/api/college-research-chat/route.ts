import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { MAX_RESEARCH_CHAT_MESSAGES } from "@/lib/usage";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Web search + dynamic filtering. Supported on Sonnet 4.6 (the model this app
// already uses elsewhere), which keeps the helper consistent with the rest of
// the codebase while letting Claude actually read the college's site.
const MODEL = "claude-sonnet-4-6";
const MAX_SEARCHES = 3;
const MAX_TURN_CONTINUATIONS = 4;

type IncomingMessage = { role: "assistant" | "student"; content: string };

type Source = { title: string; url: string };

function stripEmDashes(text: string): string {
  return text.replace(/—/g, "-").replace(/–/g, "-");
}

// Pull a bare hostname (no protocol, no path) out of whatever the college
// record stored for its website, so we can scope web search to the official site.
function collegeDomain(website: string): string | null {
  const raw = website.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return url.hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

function buildSystemPrompt(domain: string | null): string {
  return `You are the Research Helper inside a college-application planning tool. You are a general-purpose assistant that specializes in one thing: finding concrete matches between a student's activities, honors, skills, and goals and the specific offerings of a particular college — courses, professors, labs, research groups, clubs, institutes, and campus resources.

How you work:
- Use the web_search tool to look at the college's own website and other reliable sources before answering. Do not rely on memory for specific program names, professors, courses, or clubs — those change, so verify them.
${domain ? `- Prioritize the college's official site (${domain}) for programs, faculty, courses, and resources. You may consult other reputable sources (department pages, official news) when the official site is thin.` : "- Prioritize the college's official website and official department pages."}
- Ground every specific claim (a named lab, professor, course, club, or program) in something you actually found via search. If you cannot verify a specific, say so plainly and suggest where the student can look instead of inventing a name.
- Always connect what you find back to THIS student's background. The goal is a usable connection: "You did X, so Y at this college would let you explore Z."

Style:
- Warm, concrete, and brief. A few sentences to a short paragraph, not an essay.
- Write in plain text only. No markdown or formatting of any kind: no asterisks, bold, italics, headers, bullet points, numbered lists, or backticks. If you need to list a few things, write them in a sentence or separate them with line breaks and plain dashes.
- Do not use em-dashes or en-dashes; use a regular hyphen.
- This is planning material to help the student research and write, not a finished essay. Never write the essay for them.`;
}

function buildContextBlock(payload: {
  collegeName: string;
  location: string;
  intendedMajor: string;
  profileSummary: string;
  sections: string;
}): string {
  return `Here is the context for this conversation.

COLLEGE: ${payload.collegeName}
LOCATION: ${payload.location || "Not provided"}
STUDENT'S INTENDED MAJOR(S): ${payload.intendedMajor || "Undecided"}

STUDENT PROFILE (activities, honors, goals):
${payload.profileSummary || "No profile details provided yet."}

WHAT THE STUDENT HAS BRAINSTORMED / FOUND SO FAR:
${payload.sections || "Nothing yet."}

Use this to tailor everything you say to this specific student and this specific college.`;
}

// Collect the sources Claude actually used: prefer citations attached to the
// answer text, and fall back to the raw web_search results if nothing was cited.
function extractSources(content: Anthropic.Messages.ContentBlock[]): Source[] {
  const byUrl = new Map<string, Source>();
  const searchResults: Source[] = [];

  for (const block of content) {
    if (block.type === "text") {
      const citations = (block as { citations?: unknown }).citations;
      if (Array.isArray(citations)) {
        for (const citation of citations) {
          const url = (citation as { url?: unknown }).url;
          if (typeof url === "string" && url) {
            const title = (citation as { title?: unknown }).title;
            if (!byUrl.has(url)) {
              byUrl.set(url, {
                url,
                title: typeof title === "string" && title ? title : url,
              });
            }
          }
        }
      }
    } else if (block.type === "web_search_tool_result") {
      const results = (block as { content?: unknown }).content;
      if (Array.isArray(results)) {
        for (const result of results) {
          const url = (result as { url?: unknown }).url;
          if (typeof url === "string" && url) {
            const title = (result as { title?: unknown }).title;
            searchResults.push({
              url,
              title: typeof title === "string" && title ? title : url,
            });
          }
        }
      }
    }
  }

  if (byUrl.size > 0) return Array.from(byUrl.values());

  // Nothing was cited inline: surface the top search hits so the student still
  // gets links to check.
  const deduped = new Map<string, Source>();
  for (const source of searchResults) {
    if (!deduped.has(source.url)) deduped.set(source.url, source);
  }
  return Array.from(deduped.values()).slice(0, 4);
}

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

  // Anonymous/guest sessions don't count as "signed in" — block them from this
  // paid feature so they can't burn search + model tokens (and can't reset their
  // quota by clearing cookies).
  if (user.is_anonymous) {
    return NextResponse.json(
      { error: "not_signed_in", message: "Sign in to use the research helper." },
      { status: 401 }
    );
  }

  let body: {
    collegeName?: string;
    website?: string;
    location?: string;
    intendedMajor?: string;
    profileSummary?: string;
    sections?: string;
    studentMessage?: string;
    history?: IncomingMessage[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const collegeName = (body.collegeName ?? "").trim();
  if (!collegeName) {
    return NextResponse.json({ error: "Missing college." }, { status: 400 });
  }

  // Reserve one message for this month before spending any tokens. This is
  // atomic in the DB, so rapid-fire sends can't slip past the quota.
  const { data: messageCount, error: usageError } = await supabase.rpc(
    "consume_research_chat_message",
    { max_msgs: MAX_RESEARCH_CHAT_MESSAGES }
  );

  if (usageError) {
    console.error("consume_research_chat_message error:", usageError);
    const notSetUp = /consume_research_chat_message|schema cache|function/i.test(
      usageError.message ?? ""
    );
    return NextResponse.json(
      {
        error: notSetUp
          ? "Usage tracking is not set up yet. Run supabase/research_chat_rate_limit_schema.sql in Supabase."
          : "Could not verify your usage. Please try again.",
      },
      { status: 500 }
    );
  }

  if (messageCount === -1) {
    return NextResponse.json(
      {
        error: `You've used all ${MAX_RESEARCH_CHAT_MESSAGES} research helper messages for this month.`,
      },
      { status: 429 }
    );
  }

  const domain = collegeDomain(body.website ?? "");

  const contextBlock = buildContextBlock({
    collegeName,
    location: (body.location ?? "").trim(),
    intendedMajor: (body.intendedMajor ?? "").trim(),
    profileSummary: (body.profileSummary ?? "").trim(),
    sections: (body.sections ?? "").trim(),
  });

  const studentMessage = (body.studentMessage ?? "").trim();
  const opener = studentMessage
    ? studentMessage
    : `Suggest a few specific things at ${collegeName} that connect to my background, and how they connect. Look them up so they're real.`;

  // Rebuild the conversation for the model. Lead with the context, then replay
  // the prior turns, then the student's newest message.
  const history = Array.isArray(body.history) ? body.history : [];
  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: `${contextBlock}\n\n---\n\nStudent: ${opener}` },
  ];
  for (const message of history) {
    if (!message || typeof message.content !== "string") continue;
    const text = message.content.trim();
    if (!text) continue;
    messages.push({
      role: message.role === "assistant" ? "assistant" : "user",
      content: text,
    });
  }
  messages.push({ role: "user", content: opener });

  const system = buildSystemPrompt(domain);
  const tools: Anthropic.Messages.MessageCreateParams["tools"] = [
    {
      type: "web_search_20260209",
      name: "web_search",
      max_uses: MAX_SEARCHES,
      ...(domain ? { allowed_domains: [domain] } : {}),
    },
  ];

  const encoder = new TextEncoder();
  // Newline-delimited JSON events: {type:"status"|"delta"|"sources"|"error"|"done", ...}
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      const sourcesByUrl = new Map<string, Source>();
      let sentAnyText = false;

      try {
        let continuations = 0;
        // Stream one message at a time; the web-search server loop can pause
        // itself (pause_turn), in which case we resume with the same turn.
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const messageStream = anthropic.messages.stream({
            model: MODEL,
            max_tokens: 1200,
            system,
            tools,
            messages,
          });

          for await (const event of messageStream) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "server_tool_use") {
                send({
                  type: "status",
                  text: domain
                    ? `Searching ${collegeName}'s site...`
                    : `Searching for ${collegeName} details...`,
                });
              }
            } else if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = stripEmDashes(event.delta.text);
              if (text) {
                sentAnyText = true;
                send({ type: "delta", text });
              }
            }
          }

          const final = await messageStream.finalMessage();
          for (const source of extractSources(final.content)) {
            if (!sourcesByUrl.has(source.url)) sourcesByUrl.set(source.url, source);
          }

          if (final.stop_reason === "pause_turn" && continuations < MAX_TURN_CONTINUATIONS) {
            messages.push({ role: "assistant", content: final.content });
            continuations += 1;
            continue;
          }
          break;
        }

        if (!sentAnyText) {
          send({
            type: "error",
            message: "The helper could not put together an answer. Please try rephrasing.",
          });
        } else if (sourcesByUrl.size > 0) {
          send({ type: "sources", sources: Array.from(sourcesByUrl.values()) });
        }
        send({ type: "done" });
      } catch (err) {
        console.error("College research chat error:", err);
        // Surface the real cause instead of a generic message. Anthropic SDK
        // errors carry a status + message (e.g. 401 bad key, 400 tool/model
        // access, 529 overloaded) — hiding those makes the helper impossible
        // to debug from the UI.
        const status =
          err && typeof err === "object" && "status" in err
            ? (err as { status?: unknown }).status
            : undefined;
        const detail =
          err instanceof Error ? err.message : typeof err === "string" ? err : "";
        const message = detail
          ? `The research helper hit an error${
              typeof status === "number" ? ` (${status})` : ""
            }: ${detail}`
          : "The research helper hit an error. Please try again.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
