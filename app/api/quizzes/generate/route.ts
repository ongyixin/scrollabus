import { NextRequest, NextResponse } from "next/server";
import { generateAndSaveQuizzes } from "@/lib/quizzes";

// POST /api/quizzes/generate
// Called directly by the materials route (fire-and-forget) to generate quiz questions.
// Can also be used as a standalone endpoint for manual triggering.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { material_id, raw_text, title } = body;

  if (!material_id || !raw_text) {
    return NextResponse.json({ error: "material_id and raw_text are required" }, { status: 400 });
  }

  try {
    await generateAndSaveQuizzes({ material_id, raw_text, title: title ?? "Untitled" });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[quiz-generate] error:", err);
    return NextResponse.json({ error: "Failed to generate quizzes" }, { status: 500 });
  }
}
