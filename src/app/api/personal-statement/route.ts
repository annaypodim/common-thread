import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPersonalStatementTableError,
} from "@/lib/personal-statement";
import {
  personalStatementStatuses,
  type PersonalStatementStatus,
} from "@/lib/personal-statement-types";

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { content?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.content !== "string") {
    return NextResponse.json({ error: "Draft content is required." }, { status: 400 });
  }

  let status = personalStatementStatuses.includes(body.status as PersonalStatementStatus)
    ? (body.status as PersonalStatementStatus)
    : "not_started";

  // Starting to write should update a brand-new draft without requiring the
  // student to manage its status manually.
  if (body.content.trim() && status === "not_started") status = "drafting";
  if (!body.content.trim() && status === "drafting") status = "not_started";

  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from("user_personal_statements").upsert(
    {
      user_id: user.id,
      content: body.content,
      status,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json(
      { error: getPersonalStatementTableError(error.message) },
      { status: 500 }
    );
  }

  return NextResponse.json({ status, updatedAt });
}
