import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/quizzes
// Returns quizzes linked to the current user's materials, annotated with user_response.
// Supports ?material_id= to filter to a specific material.
// Supports ?cursor= for pagination (created_at cursor).
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const materialId = searchParams.get("material_id");
  const cursor = searchParams.get("cursor");
  const limit = 20;

  // Fetch the user's material IDs to scope the query (RLS handles this too, but we
  // need the IDs for the quiz join)
  let materialIds: string[] = [];

  if (materialId) {
    // Verify this material belongs to the user
    const { data } = await supabase
      .from("materials")
      .select("id")
      .eq("id", materialId)
      .eq("user_id", user.id)
      .single();
    if (data) materialIds = [data.id];
  } else {
    const { data: mats } = await supabase
      .from("materials")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10); // cap to recent 10 materials for feed quizzes
    materialIds = (mats ?? []).map((m: { id: string }) => m.id);
  }

  if (materialIds.length === 0) {
    return NextResponse.json({ quizzes: [], nextCursor: null });
  }

  let query = supabase
    .from("quizzes")
    .select(`
      *,
      user_response:quiz_responses!left(*)
    `)
    .in("material_id", materialIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt("created_at", cursor);

  const { data: quizzes, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // quiz_responses is a left join — it returns an array; pick the user's own response
  const annotated = (quizzes ?? []).map((quiz) => {
    const responses = Array.isArray(quiz.user_response) ? quiz.user_response : [];
    const myResponse = responses.find((r: { user_id: string }) => r.user_id === user.id) ?? null;
    return {
      ...quiz,
      user_response: myResponse,
    };
  });

  const nextCursor =
    annotated.length === limit ? annotated[annotated.length - 1].created_at : null;

  return NextResponse.json({ quizzes: annotated, nextCursor });
}
