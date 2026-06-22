import { createClient } from "@/lib/supabase/server";
import {
  emptyPersonalStatementDraft,
  personalStatementStatuses,
  type PersonalStatementDraft,
  type PersonalStatementStatus,
} from "@/lib/personal-statement-types";

export async function getPersonalStatementDraft(
  userId: string
): Promise<PersonalStatementDraft> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_personal_statements")
    .select("content, status, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return emptyPersonalStatementDraft;

  return {
    content: data.content ?? "",
    status: personalStatementStatuses.includes(data.status as PersonalStatementStatus)
      ? (data.status as PersonalStatementStatus)
      : "not_started",
    updatedAt: data.updated_at ?? null,
  };
}

export function getPersonalStatementTableError(message: string) {
  if (message.includes("user_personal_statements")) {
    return "Personal Statement storage is not configured yet. Apply supabase/personal_statement_schema.sql.";
  }
  return message;
}
