"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import type {
  CollegeResearchChatMessage,
  CollegeResearchDocument,
  CollegeResearchSectionKey,
  CollegeResearchSections,
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

type SectionConfig = {
  key: CollegeResearchSectionKey;
  label: string;
  helperTitle: string;
  placeholder: string;
  researchChecklist: string[];
};

const sectionConfigs: SectionConfig[] = [
  {
    key: "collegeOffers",
    label: "What this college offers",
    helperTitle: "Research targets",
    placeholder:
      "Specific programs, classes, professors, labs, clubs, institutes, or campus resources I found...",
    researchChecklist: [
      "Courses, professors, labs, institutes, or research projects",
      "Clubs, communities, service groups, publications, or maker spaces",
      "Advising, first-year programs, study abroad, or career resources",
    ],
  },
  {
    key: "backgroundConnections",
    label: "How my background connects",
    helperTitle: "Make the connection",
    placeholder:
      "This connects to my activity in..., my interest in..., and my goal of...",
    researchChecklist: [
      "Activities, honors, jobs, family responsibilities, or projects",
      "Skills, questions, or values you have already developed",
      "Moments from your profile that make the college evidence relevant",
    ],
  },
];

const emptySections: CollegeResearchSections = {
  collegeOffers: "",
  backgroundConnections: "",
};

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function makeMessage(role: CollegeResearchChatMessage["role"], content: string) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function summarizeProfile(profile: UserProfileData) {
  const activityNames = profile.activities
    .slice(0, 4)
    .map((activity) => [activity.position_title, activity.organization].filter(Boolean).join(" at "))
    .filter(Boolean);
  const honorNames = profile.honors.slice(0, 3).map((honor) => honor.title).filter(Boolean);

  return {
    majors: profile.intendedMajors.trim(),
    activities: activityNames,
    honors: honorNames,
  };
}

function buildAssistantReply({
  college,
  profile,
  activeSection,
  sections,
  studentMessage,
}: {
  college: SavedCollege;
  profile: UserProfileData;
  activeSection: SectionConfig;
  sections: CollegeResearchSections;
  studentMessage?: string;
}) {
  const profileSummary = summarizeProfile(profile);
  const major = college.intendedMajor || profileSummary.majors || "your intended academic direction";
  const collegeOffersNotes = sections.collegeOffers.trim();
  const activityText = profileSummary.activities.length
    ? `Your profile already points to ${profileSummary.activities.join(", ")}.`
    : "Your profile activities are still light here, so use this section to name the experiences you want colleges to understand.";
  const messageLead = studentMessage?.trim()
    ? `Based on what you wrote, look for details you can verify on ${toTitleCase(college.collegeName)}'s site.`
    : `For ${toTitleCase(college.collegeName)}, look for one concrete detail tied to ${major}.`;

  if (activeSection.key === "collegeOffers") {
    return `${messageLead} Good places to check are department pages, course catalogs, research labs, institutes, student clubs, honors programs, advising pages, and campus project groups. Add only the details that feel relevant enough to use later.`;
  }

  if (activeSection.key === "backgroundConnections") {
    const collegeEvidence = collegeOffersNotes
      ? "Use one of the college details you already listed and connect it to your experience, interests, or goals."
      : "If this feels hard, first add one specific program, club, lab, class, or resource under what the college offers.";
    return `${activityText} ${collegeEvidence} A useful note can be simple: "I have done X, so Y at ${toTitleCase(college.collegeName)} would help me explore Z."`;
  }

  return `${messageLead} Start with programs, clubs, labs, courses, professors, institutes, or campus resources. Then use the connection section to crystalize why those details matter for you.`;
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
            `Start by collecting a few specific things ${toTitleCase(college.collegeName)} offers: programs, classes, labs, clubs, institutes, or campus resources. Then I can help connect them to your background.`
          ),
        ]
  );
  const [activeSectionKey, setActiveSectionKey] = useState<CollegeResearchSectionKey>("collegeOffers");
  const [studentMessage, setStudentMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeSection = useMemo(
    () => sectionConfigs.find((section) => section.key === activeSectionKey) ?? sectionConfigs[0],
    [activeSectionKey]
  );

  const completedSections = sectionConfigs.filter((section) => sections[section.key].trim()).length;

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
      setStatusMessage(nextStatus === "complete" ? "Document marked complete." : "Document saved.");
    });
  };

  const askHelper = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmedMessage = studentMessage.trim();
    const nextMessages = trimmedMessage
      ? [...chatMessages, makeMessage("student", trimmedMessage)]
      : chatMessages;
    const reply = buildAssistantReply({
      college,
      profile,
      activeSection,
      sections,
      studentMessage: trimmedMessage,
    });

    setChatMessages([...nextMessages, makeMessage("assistant", reply)]);
    setStudentMessage("");
  };

  if (!document) {
    return (
      <section className="rounded-2xl border border-border-soft bg-white p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">College Research</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Build a college connection document</h2>
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
      <div className="rounded-2xl border border-border-soft bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">College Research</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">College connection document</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Add what the college offers, connect it to your background, and use the helper to crystalize what to research next.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => saveDocument("drafting")}
              disabled={isPending}
              className="rounded-full border border-border-soft bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-ivory disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save Document"}
            </button>
            <button
              type="button"
              onClick={() => saveDocument("complete")}
              disabled={isPending}
              className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              Mark Complete
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-secondary">
          <span className="rounded-full border border-border-soft bg-ivory px-3 py-1">{completedSections}/2 sections started</span>
          <span className="rounded-full border border-border-soft bg-ivory px-3 py-1">
            Status: {document.status === "complete" ? "Complete" : "Drafting"}
          </span>
          {statusMessage && <span className="rounded-full border border-border-soft bg-white px-3 py-1 text-forest">{statusMessage}</span>}
          {errorMessage && <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-700">{errorMessage}</span>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 rounded-2xl border border-border-soft bg-white p-4 sm:p-5">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sectionConfigs.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSectionKey(section.key)}
                className={`shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                  activeSectionKey === section.key
                    ? "border-forest bg-forest text-white"
                    : "border-border-soft bg-ivory text-text-secondary hover:bg-white"
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_16rem]">
            <label className="min-w-0">
              <span className="text-lg font-semibold">{activeSection.label}</span>
              <textarea
                value={sections[activeSection.key]}
                onChange={(event) =>
                  setSections((current) => ({ ...current, [activeSection.key]: event.target.value }))
                }
                placeholder={activeSection.placeholder}
                className="mt-3 min-h-72 w-full resize-y rounded-xl border border-border-soft bg-ivory/60 p-4 text-sm leading-6 outline-none transition-colors placeholder:text-text-tertiary focus:border-forest focus:bg-white"
              />
            </label>

            <aside className="rounded-xl border border-border-soft bg-ivory/70 p-4">
              <h3 className="text-sm font-semibold">{activeSection.helperTitle}</h3>
              <ul className="mt-3 space-y-2 text-sm leading-5 text-text-secondary">
                {activeSection.researchChecklist.map((item) => (
                  <li key={item} className="border-b border-border-soft pb-2 last:border-b-0 last:pb-0">
                    {item}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>

        <aside className="rounded-2xl border border-border-soft bg-white p-4 sm:p-5">
          <h3 className="text-lg font-semibold">Research Helper</h3>
          <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`rounded-xl px-3 py-2 text-sm leading-5 ${
                  message.role === "assistant" ? "bg-ivory text-foreground" : "bg-forest text-white"
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>
          <form onSubmit={askHelper} className="mt-4 space-y-2">
            <textarea
              value={studentMessage}
              onChange={(event) => setStudentMessage(event.target.value)}
              placeholder="Ask for a more targeted question, or paste a college detail you found..."
              className="min-h-24 w-full resize-y rounded-xl border border-border-soft bg-ivory/60 p-3 text-sm leading-5 outline-none transition-colors placeholder:text-text-tertiary focus:border-forest focus:bg-white"
            />
            <button
              type="submit"
              className="w-full rounded-full bg-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light"
            >
              Send to Helper
            </button>
          </form>
        </aside>
      </div>

      <article className="rounded-2xl border border-border-soft bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">Saved Document</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{toTitleCase(college.collegeName)} research notes</h2>
          </div>
          <p className="text-sm text-text-secondary">Updated {new Date(document.updatedAt).toLocaleDateString()}</p>
        </div>
        <div className="mt-5 grid gap-4">
          {sectionConfigs.map((section) => (
            <section key={`${section.key}-preview`} className="rounded-xl border border-border-soft bg-ivory/50 p-4">
              <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                {sections[section.key].trim() || "No notes yet."}
              </p>
            </section>
          ))}
        </div>
      </article>
    </section>
  );
}
