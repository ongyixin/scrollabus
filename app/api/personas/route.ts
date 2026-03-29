import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function buildSystemPrompt({
  name,
  roleTag,
  tone,
  teachingStyle,
  description,
}: {
  name: string;
  roleTag: string;
  tone: string;
  teachingStyle: string;
  description: string;
}): string {
  return `You are ${name} — a study persona with the role of ${roleTag}.
Your tone is: ${tone}.
Your teaching approach: ${teachingStyle}.
About you: ${description}
Keep responses concise and focused. Always stay true to your personality and teaching style.
When helping with academic content, make sure your responses are accurate and genuinely useful to the student.`;
}

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50) +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

// GET /api/personas — all personas visible to the current user
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS will enforce visibility: defaults + public + own
  const { data: personas, error } = await supabase
    .from("personas")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ personas: personas ?? [] });
}

// POST /api/personas — create a custom persona
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const emoji = typeof body.emoji === "string" ? body.emoji.trim() : "";
  const roleTag = typeof body.role_tag === "string" ? body.role_tag.trim() : "";
  const accentColor =
    typeof body.accent_color === "string" ? body.accent_color.trim() : "#C9B8E8";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const tone = typeof body.tone === "string" ? body.tone.trim() : "";
  const teachingStyle =
    typeof body.teaching_style === "string" ? body.teaching_style.trim() : "";
  const isPublic = typeof body.is_public === "boolean" ? body.is_public : false;

  // Validate required fields
  const missing: string[] = [];
  if (!name) missing.push("name");
  if (!emoji) missing.push("emoji");
  if (!roleTag) missing.push("role_tag");
  if (!description) missing.push("description");
  if (!tone) missing.push("tone");
  if (!teachingStyle) missing.push("teaching_style");

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate accent color is a hex string
  if (!/^#[0-9A-Fa-f]{6}$/.test(accentColor)) {
    return NextResponse.json(
      { error: "accent_color must be a valid hex color (e.g. #C9B8E8)" },
      { status: 400 }
    );
  }

  const slug = generateSlug(name);
  const systemPrompt = buildSystemPrompt({ name, roleTag, tone, teachingStyle, description });

  const { data: persona, error } = await supabase
    .from("personas")
    .insert({
      slug,
      name,
      emoji,
      role_tag: roleTag,
      accent_color: accentColor,
      description,
      tone,
      teaching_style: teachingStyle,
      system_prompt: systemPrompt,
      is_public: isPublic,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ persona }, { status: 201 });
}
