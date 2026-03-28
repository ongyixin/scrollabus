import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServiceClient } from "@/lib/supabase/service";
import { QUIZZES_PER_MATERIAL } from "@/lib/constants";

interface RawQuizOption {
  id: string;
  text: string;
}

interface RawQuiz {
  question_type: "multiple_choice" | "multiple_response" | "free_text";
  question: string;
  options?: RawQuizOption[];
  correct_answer: string[] | { text: string };
  explanation: string;
}

const GENERATION_SYSTEM_PROMPT = `You are an expert educator who creates high-quality quiz questions to help students test their understanding of study material.

Given a piece of study material, generate exactly ${QUIZZES_PER_MATERIAL} diverse quiz questions that test comprehension, application, and critical thinking.

Rules:
- Mix question types: include at least one multiple_choice, and distribute among multiple_response and free_text as well.
- Questions must be directly answerable from the provided material.
- For multiple_choice: provide 4 options (ids: "a", "b", "c", "d"), exactly one correct answer.
- For multiple_response: provide 4-5 options (ids: "a", "b", "c", "d", optionally "e"), 2-3 correct answers.
- For free_text: provide a model answer that clearly explains the correct response.
- The explanation should be 1-3 sentences — clear, educational, and reference the material.
- Options should be plausible; wrong answers should represent common misconceptions, not be obviously wrong.
- Questions should vary in difficulty.

Return ONLY a valid JSON array of quiz objects. No markdown fences, no extra text.

Each object must match this structure:
{
  "question_type": "multiple_choice" | "multiple_response" | "free_text",
  "question": "...",
  "options": [{ "id": "a", "text": "..." }, ...] | null,
  "correct_answer": ["a"] | ["a", "c"] | { "text": "model answer here" },
  "explanation": "..."
}`;

export async function generateAndSaveQuizzes({
  material_id,
  raw_text,
  title,
}: {
  material_id: string;
  raw_text: string;
  title: string;
}): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[quiz] GEMINI_API_KEY not configured — skipping quiz generation");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: GENERATION_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const truncatedText = raw_text.length > 4000 ? raw_text.slice(0, 4000) + "..." : raw_text;

  const userPrompt = `Title: ${title}

Study material:
${truncatedText}

Generate ${QUIZZES_PER_MATERIAL} quiz questions based on this material.`;

  let quizzes: RawQuiz[] = [];

  try {
    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Response is not an array");
    quizzes = parsed;
  } catch (err) {
    console.error("[quiz] Gemini generation/parse error:", err);
    return;
  }

  const validQuizzes = quizzes
    .filter((q) => {
      if (!q.question_type || !q.question || !q.correct_answer || !q.explanation) return false;
      if (!["multiple_choice", "multiple_response", "free_text"].includes(q.question_type)) return false;
      if (q.question_type !== "free_text" && (!Array.isArray(q.options) || q.options.length < 2)) return false;
      return true;
    })
    .map((q) => ({
      material_id,
      question_type: q.question_type,
      question: q.question,
      options: q.options ?? null,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }));

  if (validQuizzes.length === 0) {
    console.error("[quiz] No valid quizzes parsed — skipping DB insert");
    return;
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("quizzes").insert(validQuizzes);
  if (error) {
    console.error("[quiz] DB insert error:", error);
  } else {
    console.log(`[quiz] Inserted ${validQuizzes.length} quizzes for material ${material_id}`);
  }
}
