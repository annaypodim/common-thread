export const personalStatementStatuses = [
  "not_started",
  "drafting",
  "needs_revision",
  "complete",
] as const;

export type PersonalStatementStatus = (typeof personalStatementStatuses)[number];

export type PersonalStatementDraft = {
  content: string;
  status: PersonalStatementStatus;
  updatedAt: string | null;
};

export const emptyPersonalStatementDraft: PersonalStatementDraft = {
  content: "",
  status: "not_started",
  updatedAt: null,
};

export function countWords(content: string) {
  const trimmed = content.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
