"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type {
  CollegeResearchChatMessage,
  CollegeResearchDocument,
  CollegeResearchSectionKey,
  CollegeResearchSections,
  CollegeResearchSource,
} from "@/lib/college-research";
import type { SavedCollege } from "@/lib/colleges";
import type { UserProfileData } from "@/lib/profile";

type ResearchActionState = {
  error?: string;
  document?: CollegeResearchDocument;
};

type CollegeResearchWorkspaceProps = {
  college: SavedCollege;
  profile: UserProfileData;
  initialDocument: CollegeResearchDocument | null;
  createResearchDocumentAction: () => Promise<ResearchActionState>;
  saveResearchDocumentAction: (
    sections: CollegeResearchSections,
    chatMessages: CollegeResearchChatMessage[],
    status: "drafting" | "complete"
  ) => Promise<ResearchActionState>;
};

type FieldConfig = {
  key: CollegeResearchSectionKey;
  label: string;
  placeholder: string;
  fullWidth?: boolean;
};

const brainstormFields: FieldConfig[] = [
  {
    key: "classes",
    label: "Classes & courses",
    placeholder: "Course names, sequences, or programs that fit your interests...",
  },
  {
    key: "professors",
    label: "Professors",
    placeholder: "Faculty whose research or teaching connects to your goals...",
  },
  {
    key: "labs",
    label: "Labs & research",
    placeholder: "Research groups, labs, institutes, or projects to join...",
  },
  {
    key: "clubs",
    label: "Clubs & communities",
    placeholder: "Clubs, publications, service groups, maker spaces...",
  },
  {
    key: "otherResources",
    label: "Other resources",
    placeholder: "Advising, first-year programs, study abroad, careers...",
  },
];

const synthesisField: FieldConfig = {
  key: "synthesis",
  label: "Put it all together",
  placeholder:
    "Pull your bullets into a few clear paragraphs: what draws you to this college, the specific things you found, and how they connect to who you are and what you want to do.",
};

const researchTargets = [
  "Courses, professors, labs, institutes, or research projects",
  "Clubs, communities, service groups, publications, or maker spaces",
  "Advising, first-year programs, study abroad, or career resources",
  "Your own activities, honors, skills, and goals that connect to them",
];

const emptySections: CollegeResearchSections = {
  classes: "",
  professors: "",
  labs: "",
  clubs: "",
  otherResources: "",
  backgroundConnections: "",
  synthesis: "",
};

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function makeMessage(
  role: CollegeResearchChatMessage["role"],
  content: string,
  sources?: CollegeResearchSource[]
): CollegeResearchChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    ...(sources && sources.length ? { sources } : {}),
  };
}

// Compact, plain-text summary of the student's profile for the AI helper to
// tailor its suggestions to who they actually are.
function buildProfileSummary(profile: UserProfileData) {
  const lines: string[] = [];
  const majors = profile.intendedMajors.trim();
  if (majors) lines.push(`Intended major(s): ${majors}`);
  if (profile.highSchool.trim()) lines.push(`High school: ${profile.highSchool.trim()}`);

  if (profile.activities.length) {
    lines.push("Activities:");
    for (const activity of profile.activities.slice(0, 8)) {
      const label = [activity.position_title, activity.organization].filter(Boolean).join(" at ");
      const detail = activity.description?.trim();
      lines.push(`- ${label || "Activity"}${detail ? `: ${detail}` : ""}`);
    }
  }

  if (profile.honors.length) {
    lines.push("Honors:");
    for (const honor of profile.honors.slice(0, 6)) {
      const detail = honor.achievement_description?.trim();
      lines.push(`- ${honor.title}${detail ? `: ${detail}` : ""}`);
    }
  }

  return lines.join("\n");
}

// Flatten the brainstorm bullets into text the helper can react to.
function buildSectionsSummary(sections: CollegeResearchSections) {
  const parts: string[] = [];
  for (const field of brainstormFields) {
    const value = sections[field.key]?.trim();
    if (value) parts.push(`${field.label}: ${value}`);
  }
  const synthesis = sections.synthesis?.trim();
  if (synthesis) parts.push(`Draft synthesis: ${synthesis}`);
  return parts.join("\n");
}

export function CollegeResearchWorkspace({
  college,
  profile,
  initialDocument,
  createResearchDocumentAction,
  saveResearchDocumentAction,
}: CollegeResearchWorkspaceProps) {
  const [document, setDocument] = useState(initialDocument);
  const [sections, setSections] = useState<CollegeResearchSections>(
    initialDocument?.sections ?? emptySections
  );
  const [chatMessages, setChatMessages] = useState<CollegeResearchChatMessage[]>(
    initialDocument?.chatMessages.length
      ? initialDocument.chatMessages
      : [
          makeMessage(
            "assistant",
            `I can look up ${toTitleCase(college.collegeName)}'s programs, professors, labs, clubs, and resources and connect them to your activities and goals, with sources you can check. Ask me something, or just hit Send and I'll suggest a few specific matches.`
          ),
        ]
  );
  const [studentMessage, setStudentMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isHelperThinking, setIsHelperThinking] = useState(false);
  const [helperError, setHelperError] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [streamingStatus, setStreamingStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef(sections);
  const chatMessagesRef = useRef(chatMessages);

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  useEffect(() => {
    // Scroll only the chat log itself to the bottom, without moving the page.
    const container = chatScrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [chatMessages, isHelperThinking, streamingText, streamingStatus]);

  const location = useMemo(
    () =>
      [college.city && toTitleCase(college.city), college.state].filter(Boolean).join(", ") ||
      "Location not saved",
    [college.city, college.state]
  );
  const major = college.intendedMajor || profile.intendedMajors || "Not set";

  const completedSections = brainstormFields.filter((field) => sections[field.key].trim()).length;

  const startDocument = () => {
    setErrorMessage("");
    setStatusMessage("");
    startTransition(async () => {
      const result = await createResearchDocumentAction();
      if (result.error || !result.document) {
        setErrorMessage(result.error ?? "Unable to start the research document.");
        return;
      }

      setDocument(result.document);
      setSections(result.document.sections);
      setChatMessages((current) => (current.length ? current : result.document?.chatMessages ?? []));
      setStatusMessage("Research document created.");
    });
  };

  const saveDocument = (nextStatus: "drafting" | "complete" = "drafting") => {
    setErrorMessage("");
    setStatusMessage("");
    startTransition(async () => {
      const result = await saveResearchDocumentAction(sections, chatMessages, nextStatus);
      if (result.error || !result.document) {
        setErrorMessage(result.error ?? "Unable to save the research document.");
        return;
      }

      setDocument(result.document);
      setSections(result.document.sections);
      setChatMessages(result.document.chatMessages);
      setStatusMessage(nextStatus === "complete" ? "Document marked complete." : "All changes saved.");
    });
  };

  const persistChatMessages = async (nextMessages: CollegeResearchChatMessage[]) => {
    if (!document) return;

    try {
      const result = await saveResearchDocumentAction(
        sectionsRef.current,
        nextMessages,
        document.status
      );

      if (result.error || !result.document) {
        setHelperError(result.error ?? "The chat was not saved. Please try again.");
        return;
      }

      setDocument(result.document);
    } catch {
      setHelperError("The chat was not saved. Please try again.");
    }
  };

  const askHelper = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (isHelperThinking) return;

    const trimmedMessage = studentMessage.trim();
    const priorMessages = chatMessagesRef.current;
    const nextMessages = trimmedMessage
      ? [...priorMessages, makeMessage("student", trimmedMessage)]
      : priorMessages;

    setHelperError("");
    setChatMessages(nextMessages);
    setStudentMessage("");
    setStreamingText("");
    setStreamingStatus(`Searching ${toTitleCase(college.collegeName)}'s site...`);
    setIsHelperThinking(true);

    try {
      const response = await fetch("/api/college-research-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collegeName: toTitleCase(college.collegeName),
          website: college.website,
          location,
          intendedMajor: major,
          profileSummary: buildProfileSummary(profile),
          sections: buildSectionsSummary(sections),
          studentMessage: trimmedMessage,
          // Only the visible transcript, not the newly added student turn (sent
          // separately as studentMessage) and not any pending state.
          history: priorMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      // Non-streaming responses (quota / auth / setup errors) come back as JSON.
      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;
        setHelperError(
          data?.message ?? data?.error ?? "The research helper could not respond. Please try again."
        );
        if (trimmedMessage) {
          await persistChatMessages(nextMessages);
        }
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";
      let sources: CollegeResearchSource[] | undefined;
      let streamError = "";

      // Read the newline-delimited JSON event stream.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let event: {
            type?: string;
            text?: string;
            sources?: CollegeResearchSource[];
            message?: string;
          };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.type === "status" && event.text) {
            setStreamingStatus(event.text);
          } else if (event.type === "delta" && event.text) {
            answer += event.text;
            setStreamingText(answer);
          } else if (event.type === "sources" && event.sources) {
            sources = event.sources;
          } else if (event.type === "error" && event.message) {
            streamError = event.message;
          }
        }
      }

      if (streamError && !answer) {
        setHelperError(streamError);
        if (trimmedMessage) {
          await persistChatMessages(nextMessages);
        }
        return;
      }

      if (answer) {
        const finalMessages = [...nextMessages, makeMessage("assistant", answer, sources)];
        setChatMessages(finalMessages);
        await persistChatMessages(finalMessages);
      } else {
        setHelperError("The research helper could not respond. Please try again.");
        if (trimmedMessage) {
          await persistChatMessages(nextMessages);
        }
      }
    } catch {
      setHelperError("Could not reach the research helper. Check your connection and try again.");
      if (trimmedMessage) {
        await persistChatMessages(nextMessages);
      }
    } finally {
      setIsHelperThinking(false);
      setStreamingText("");
      setStreamingStatus("");
    }
  };

  if (!document) {
    return (
      <section className="rounded-2xl border border-border-soft bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">College Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          {toTitleCase(college.collegeName)}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {location} · Intended major: <span className="font-medium text-foreground">{major}</span>
        </p>
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Build a college connection document</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Create one saved document for this college with specific evidence and personal connections. This is planning
              material, not a finished essay.
            </p>
          </div>
          <button
            type="button"
            onClick={startDocument}
            disabled={isPending}
            className="rounded-full bg-forest px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Starting..." : "Start Research Document"}
          </button>
        </div>
        {errorMessage && <p className="mt-4 text-sm text-red-700">{errorMessage}</p>}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {/* Merged single header: college identity + document status + Mark Complete */}
      <header className="rounded-2xl border border-border-soft bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">College Connection Document</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              {toTitleCase(college.collegeName)}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {location} · Intended major: <span className="font-medium text-foreground">{major}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => saveDocument("complete")}
            disabled={isPending}
            className="shrink-0 rounded-full bg-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mark Complete
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-secondary">
          <span className="rounded-full border border-border-soft bg-ivory px-3 py-1">
            {completedSections}/{brainstormFields.length} brainstorm sections filled
          </span>
          <span className="rounded-full border border-border-soft bg-ivory px-3 py-1">
            Status: {document.status === "complete" ? "Complete" : "Drafting"}
          </span>
          <span className="rounded-full border border-border-soft bg-ivory px-3 py-1">
            Updated {new Date(document.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </header>

      {/* Brainstorming (bullet sections + advice) */}
      <div className="rounded-2xl border border-border-soft bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold tracking-tight">Brainstorm</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {brainstormFields.map((field) => (
              <label key={field.key} className={`min-w-0 ${field.fullWidth ? "sm:col-span-2" : ""}`}>
                <span className="text-sm font-semibold">{field.label}</span>
                <textarea
                  value={sections[field.key]}
                  onChange={(event) =>
                    setSections((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                  placeholder={field.placeholder}
                  className="mt-2 min-h-20 w-full resize-y rounded-xl border border-border-soft bg-ivory/60 p-3 text-sm leading-5 outline-none transition-colors placeholder:text-text-tertiary focus:border-forest focus:bg-white"
                />
              </label>
            ))}
          </div>

          {/* Brainstorming advice — what to look for — beneath the brainstorm section */}
          <div className="mt-4 rounded-xl border border-border-soft bg-ivory/70 p-4">
            <h3 className="text-sm font-semibold">What to look for</h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-5 text-text-secondary">
              {researchTargets.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </div>
        </div>

      {/* Research helper — full width, below the brainstorm */}
      <section className="flex max-h-[36rem] flex-col rounded-2xl border border-border-soft bg-white p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Research Helper</h3>
          <p className="mt-1 text-xs text-text-secondary">
            Looks up {toTitleCase(college.collegeName)}&apos;s site to find real matches for your background, with sources.
          </p>
          <div ref={chatScrollRef} className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`rounded-xl px-3 py-2 text-sm leading-5 ${
                  message.role === "assistant" ? "bg-ivory text-foreground" : "bg-forest text-white"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 border-t border-border-soft pt-2">
                    <p className="text-xs font-semibold text-text-secondary">Sources</p>
                    <ul className="mt-1 space-y-1">
                      {message.sources.map((source) => (
                        <li key={source.url}>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-forest underline underline-offset-2 hover:text-forest-light break-words"
                          >
                            {source.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            {isHelperThinking && (
              <div className="rounded-xl bg-ivory px-3 py-2 text-sm leading-5 text-foreground">
                {streamingText ? (
                  <p className="whitespace-pre-wrap">{streamingText}</p>
                ) : (
                  <p className="text-text-secondary">{streamingStatus || "Thinking..."}</p>
                )}
              </div>
            )}
          </div>
          {helperError && <p className="mt-2 text-sm text-red-700">{helperError}</p>}
          <form onSubmit={askHelper} className="mt-4 flex items-stretch gap-2">
            <textarea
              value={studentMessage}
              onChange={(event) => setStudentMessage(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends; Shift+Enter inserts a newline.
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  askHelper();
                }
              }}
              placeholder="Ask for a more targeted question, or paste a college detail you found..."
              className="min-h-24 flex-1 resize-y rounded-xl border border-border-soft bg-ivory/60 p-3 text-sm leading-5 outline-none transition-colors placeholder:text-text-tertiary focus:border-forest focus:bg-white"
            />
            <button
              type="submit"
              disabled={isHelperThinking}
              className="shrink-0 self-end rounded-full bg-forest px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isHelperThinking ? "Searching..." : "Send"}
            </button>
          </form>
      </section>

      {/* Synthesis — larger box to put everything together, with the save action */}
      <div className="rounded-2xl border border-border-soft bg-white p-4 sm:p-5">
        <label className="block">
          <span className="text-lg font-semibold tracking-tight">{synthesisField.label}</span>
          <p className="mt-1 text-sm text-text-secondary">
            Turn your brainstorm bullets into a clear write-up you can reuse in essays and applications.
          </p>
          <textarea
            value={sections.synthesis}
            onChange={(event) =>
              setSections((current) => ({ ...current, synthesis: event.target.value }))
            }
            placeholder={synthesisField.placeholder}
            className="mt-3 min-h-72 w-full resize-y rounded-xl border border-border-soft bg-ivory/60 p-4 text-sm leading-6 outline-none transition-colors placeholder:text-text-tertiary focus:border-forest focus:bg-white"
          />
        </label>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {statusMessage && <span className="text-sm text-forest">{statusMessage}</span>}
          {errorMessage && <span className="text-sm text-red-700">{errorMessage}</span>}
          <button
            type="button"
            onClick={() => saveDocument("drafting")}
            disabled={isPending}
            className="rounded-full bg-forest px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Save Document"}
          </button>
        </div>
      </div>
    </section>
  );
}
