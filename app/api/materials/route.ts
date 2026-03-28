import { createClient } from "@/lib/supabase/server";
import { triggerMaterialToPost } from "@/lib/n8n";
import { generateAndSaveQuizzes } from "@/lib/quizzes";
import { writeMemory } from "@/lib/hydra";
import { triggerTeachingWorkflow } from "@/lib/dify";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, raw_text, source_type = "text" } = body;

  if (!title || !raw_text) {
    return NextResponse.json({ error: "title and raw_text are required" }, { status: 400 });
  }

  if (raw_text.length < 50) {
    return NextResponse.json({ error: "Content too short — paste at least a paragraph." }, { status: 400 });
  }

  // Store material
  const { data: material, error: materialError } = await supabase
    .from("materials")
    .insert({ user_id: user.id, title, raw_text, source_type })
    .select()
    .single();

  if (materialError || !material) {
    return NextResponse.json({ error: materialError?.message ?? "Failed to save material" }, { status: 500 });
  }

  // Fetch user's preferences (non-blocking failure is fine — fall back to defaults)
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("enabled_personas, enable_av_output")
    .eq("id", user.id)
    .single();

  const enabledPersonas: string[] =
    profileRow?.enabled_personas ?? ["lecture-bestie", "exam-gremlin", "problem-grinder"];
  const enableAvOutput: boolean = profileRow?.enable_av_output ?? true;

  // Fire-and-forget: write learner memory signal to HydraDB
  writeMemory({
    userId: user.id,
    text: `User uploaded study material titled "${title}" (${source_type}). Topic preview: ${raw_text.slice(0, 200)}`,
  }).catch(() => {});

  // Fire-and-forget: trigger n8n pipeline (don't await to keep response fast)
  triggerMaterialToPost({
    material_id: material.id,
    raw_text,
    title,
    enabled_personas: enabledPersonas,
    enable_av_output: enableAvOutput,
  }).catch((err) => {
    console.error("[n8n] Material-to-post trigger failed:", err);
  });

  // Fire-and-forget: generate quiz questions from the material using Gemini
  generateAndSaveQuizzes({
    material_id: material.id,
    raw_text,
    title,
  }).catch((err) => {
    console.error("[quiz] Quiz generation failed:", err);
  });

  // Fire-and-forget: trigger Dify teaching workflow to generate a memory-aware teaching plan
  triggerTeachingWorkflow({
    eventType: "material_uploaded",
    userId: user.id,
    payload: {
      material_id: material.id,
      title,
      source_type,
      topic_preview: raw_text.slice(0, 500),
    },
  }).catch((err) => {
    console.error("[dify] Teaching workflow trigger failed:", err);
  });

  return NextResponse.json({ material_id: material.id, status: "processing" }, { status: 201 });
}
