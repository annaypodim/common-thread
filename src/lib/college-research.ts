import { createClient } from "@/lib/supabase/server";

export const collegeResearchSectionKeys = [
  "classes",
  "professors",
  "labs",
  "clubs",
  "otherResources",
  "backgroundConnections",
  "synthesis",
] as const;

export type CollegeResearchSectionKey = (typeof collegeResearchSectionKeys)[number];

export type CollegeResearchSections = Record<CollegeResearchSectionKey, string>;

export type CollegeResearchSource = {
  title: string;
  url: string;
};

export type CollegeResearchChatMessage = {
  id: string;
  role: "assistant" | "student";
  content: string;
  createdAt: string;
  sources?: CollegeResearchSource[];
};

export type CollegeResearchDocument = {
  id: string;
  userCollegeId: string;
  status: "drafting" | "complete";
  sections: CollegeResearchSections;
  chatMessages: CollegeResearchChatMessage[];
  createdAt: string;
  updatedAt: string;
};

const emptySections: CollegeResearchSections = {
  classes: "",
  professors: "",
  labs: "",
  clubs: "",
  otherResources: "",
  backgroundConnections: "",
  synthesis: "",
};

function isMissingResearchTable(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("public.college_research_documents") ||
    normalizedMessage.includes("college_research_documents") ||
    normalizedMessage.includes("could not find the table") ||
    normalizedMessage.includes("schema cache")
  );
}

function normalizeSections(value: unknown): CollegeResearchSections {
  if (!value || typeof value !== "object") return { ...emptySections };

  const rawSections = value as Partial<Record<CollegeResearchSectionKey, unknown>>;
  return collegeResearchSectionKeys.reduce<CollegeResearchSections>(
    (sections, key) => ({
      ...sections,
      [key]: typeof rawSections[key] === "string" ? rawSections[key] : "",
    }),
    { ...emptySections }
  );
}

function normalizeChatMessages(value: unknown): CollegeResearchChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((message) => {
    if (!message || typeof message !== "object") return [];
    const rawMessage = message as Partial<CollegeResearchChatMessage>;
    if (
      typeof rawMessage.id !== "string" ||
      (rawMessage.role !== "assistant" && rawMessage.role !== "student") ||
      typeof rawMessage.content !== "string" ||
      typeof rawMessage.createdAt !== "string"
    ) {
      return [];
    }

    const sources = Array.isArray(rawMessage.sources)
      ? rawMessage.sources.flatMap((source) => {
          if (!source || typeof source !== "object") return [];
          const rawSource = source as Partial<CollegeResearchSource>;
          if (typeof rawSource.url !== "string" || !rawSource.url) return [];
          return [
            {
              url: rawSource.url,
              title: typeof rawSource.title === "string" && rawSource.title ? rawSource.title : rawSource.url,
            },
          ];
        })
      : undefined;

    return [
      {
        id: rawMessage.id,
        role: rawMessage.role,
        content: rawMessage.content,
        createdAt: rawMessage.createdAt,
        ...(sources && sources.length ? { sources } : {}),
      },
    ];
  });
}

type ResearchRow = {
  id: string;
  user_college_id: string;
  status: "drafting" | "complete" | null;
  sections: unknown;
  chat_messages: unknown;
  created_at: string;
  updated_at: string;
};

function mapResearchDocument(row: ResearchRow): CollegeResearchDocument {
  return {
    id: row.id,
    userCollegeId: row.user_college_id,
    status: row.status === "complete" ? "complete" : "drafting",
    sections: normalizeSections(row.sections),
    chatMessages: normalizeChatMessages(row.chat_messages),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getEmptyCollegeResearchSections() {
  return { ...emptySections };
}

export function getMissingCollegeResearchTableMessage(errorMessage: string) {
  if (isMissingResearchTable(errorMessage)) {
    return "College research documents are not set up in Supabase yet. Run `supabase/college_schema.sql` to enable this feature.";
  }

  return errorMessage;
}

export async function getCollegeResearchDocument(userId: string, userCollegeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("college_research_documents")
    .select("id, user_college_id, status, sections, chat_messages, created_at, updated_at")
    .eq("user_id", userId)
    .eq("user_college_id", userCollegeId)
    .maybeSingle();

  if (error) {
    if (isMissingResearchTable(error.message)) return null;
    throw new Error(error.message);
  }

  return data ? mapResearchDocument(data as ResearchRow) : null;
}

export async function createCollegeResearchDocument(userId: string, userCollegeId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("college_research_documents")
    .upsert(
      {
        user_id: userId,
        user_college_id: userCollegeId,
        status: "drafting",
        sections: emptySections,
        chat_messages: [],
        updated_at: now,
      },
      { onConflict: "user_college_id" }
    )
    .select("id, user_college_id, status, sections, chat_messages, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(getMissingCollegeResearchTableMessage(error.message));
  }

  return mapResearchDocument(data as ResearchRow);
}

export async function saveCollegeResearchDocument({
  userId,
  userCollegeId,
  sections,
  chatMessages,
  status,
}: {
  userId: string;
  userCollegeId: string;
  sections: CollegeResearchSections;
  chatMessages: CollegeResearchChatMessage[];
  status: "drafting" | "complete";
}) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("college_research_documents")
    .upsert(
      {
        user_id: userId,
        user_college_id: userCollegeId,
        status,
        sections: normalizeSections(sections),
        chat_messages: normalizeChatMessages(chatMessages),
        updated_at: now,
      },
      { onConflict: "user_college_id" }
    )
    .select("id, user_college_id, status, sections, chat_messages, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(getMissingCollegeResearchTableMessage(error.message));
  }

  return mapResearchDocument(data as ResearchRow);
}
