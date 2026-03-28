import { createClient } from "@/lib/supabase/server";
import { writeMemory } from "@/lib/hydra";
import { NextRequest, NextResponse } from "next/server";
import type { Quiz } from "@/lib/types";

function arraysEqualUnordered(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((v) => setA.has(v));
}

// POST /api/quiz-responses
// Submit an answer for a quiz. Auto-grades MCQ and multiple_response.
// Returns the response + the quiz's correct_answer and explanation.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { quiz_id, answer } = body;

  if (!quiz_id || answer === undefined || answer === null) {
    return NextResponse.json({ error: "quiz_id and answer are required" }, { status: 400 });
  }

  // Fetch the quiz to validate ownership (via material) and get correct_answer
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select(`
      *,
      material:materials!inner(user_id)
    `)
    .eq("id", quiz_id)
    .single();

  if (quizError || !quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  // Ensure the quiz belongs to the user's material
  if (quiz.material?.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate answer format
  const typedQuiz = quiz as Quiz & { material: { user_id: string } };
  let is_correct: boolean | null = null;

  if (typedQuiz.question_type === "multiple_choice") {
    if (!Array.isArray(answer) || answer.length !== 1) {
      return NextResponse.json({ error: "multiple_choice requires exactly one answer" }, { status: 400 });
    }
    const correct = typedQuiz.correct_answer as string[];
    is_correct = answer[0] === correct[0];
  } else if (typedQuiz.question_type === "multiple_response") {
    if (!Array.isArray(answer) || answer.length === 0) {
      return NextResponse.json({ error: "multiple_response requires at least one answer" }, { status: 400 });
    }
    const correct = typedQuiz.correct_answer as string[];
    is_correct = arraysEqualUnordered(answer as string[], correct);
  } else if (typedQuiz.question_type === "free_text") {
    if (typeof answer !== "object" || Array.isArray(answer) || !answer.text) {
      return NextResponse.json({ error: "free_text requires { text: string }" }, { status: 400 });
    }
    is_correct = null; // subjective — not auto-graded
  }

  // Upsert the response (one response per user per quiz)
  const { data: response, error: upsertError } = await supabase
    .from("quiz_responses")
    .upsert(
      { quiz_id, user_id: user.id, answer, is_correct },
      { onConflict: "quiz_id,user_id" }
    )
    .select()
    .single();

  if (upsertError || !response) {
    return NextResponse.json({ error: upsertError?.message ?? "Failed to save response" }, { status: 500 });
  }

  // Fire-and-forget: write quiz outcome to learner memory
  const resultLabel =
    is_correct === null ? "free response (ungraded)" : is_correct ? "correct" : "incorrect";
  writeMemory({
    userId: user.id,
    text: `User answered a quiz question (${typedQuiz.question_type}): "${typedQuiz.question}" — ${resultLabel}. Their answer: ${JSON.stringify(answer)}. Correct answer: ${JSON.stringify(typedQuiz.correct_answer)}. Explanation: ${typedQuiz.explanation}`,
    infer: true,
  }).catch(() => {});

  return NextResponse.json({
    response,
    correct_answer: typedQuiz.correct_answer,
    explanation: typedQuiz.explanation,
  }, { status: 201 });
}
