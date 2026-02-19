import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

type UpdateItem = {
  id: string;
  listId: string;
  position: number;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { updates?: UpdateItem[] };
  const updates = Array.isArray(body.updates) ? body.updates : [];

  if (updates.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const results = await Promise.all(
    updates.map((item) =>
      supabase
        .from("tasks")
        .update({
          list_id: item.listId,
          position: item.position,
          updated_by: user.id,
        })
        .eq("id", item.id)
        .eq("board_id", boardId)
    )
  );

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
