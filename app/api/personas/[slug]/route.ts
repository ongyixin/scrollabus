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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  // Fetch persona
  const { data: persona, error: personaError } = await supabase
    .from("personas")
    .select("*")
    .eq("slug", slug)
    .single();

  if (personaError || !persona) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  // Fetch recent posts by this persona (from the user's own materials)
  const { data: userMaterials } = await supabase
    .from("materials")
    .select("id")
    .eq("user_id", user.id);

  const materialIds = (userMaterials ?? []).map((m: { id: string }) => m.id);

  let posts: unknown[] = [];
  if (materialIds.length > 0) {
    const { data } = await supabase
      .from("posts")
      .select("id, title, body, post_type, created_at")
      .eq("persona_id", persona.id)
      .in("material_id", materialIds)
      .order("created_at", { ascending: false })
      .limit(20);

    posts = data ?? [];
  }

  return NextResponse.json({ persona, posts });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  // Verify ownership — RLS will also enforce this
  const { data: existing, error: fetchError } = await supabase
    .from("personas")
    .select("id, created_by, name, role_tag, tone, teaching_style, description")
    .eq("slug", slug)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  if (existing.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (typeof body.emoji === "string" && body.emoji.trim()) {
    updates.emoji = body.emoji.trim();
  }
  if (typeof body.role_tag === "string" && body.role_tag.trim()) {
    updates.role_tag = body.role_tag.trim();
  }
  if (typeof body.accent_color === "string") {
    if (!/^#[0-9A-Fa-f]{6}$/.test(body.accent_color)) {
      return NextResponse.json(
        { error: "accent_color must be a valid hex color" },
        { status: 400 }
      );
    }
    updates.accent_color = body.accent_color;
  }
  if (typeof body.description === "string") {
    updates.description = body.description.trim();
  }
  if (typeof body.tone === "string") {
    updates.tone = body.tone.trim();
  }
  if (typeof body.teaching_style === "string") {
    updates.teaching_style = body.teaching_style.trim();
  }
  if (typeof body.is_public === "boolean") {
    updates.is_public = body.is_public;
  }

  // Rebuild system_prompt if any of the key fields changed
  const newName = (updates.name as string) ?? existing.name;
  const newRoleTag = (updates.role_tag as string) ?? existing.role_tag;
  const newTone = (updates.tone as string) ?? existing.tone;
  const newTeachingStyle = (updates.teaching_style as string) ?? existing.teaching_style;
  const newDescription = (updates.description as string) ?? existing.description;

  if (
    updates.name ||
    updates.role_tag ||
    updates.tone ||
    updates.teaching_style ||
    updates.description
  ) {
    updates.system_prompt = buildSystemPrompt({
      name: newName,
      roleTag: newRoleTag,
      tone: newTone,
      teachingStyle: newTeachingStyle,
      description: newDescription,
    });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data: persona, error } = await supabase
    .from("personas")
    .update(updates)
    .eq("slug", slug)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ persona });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  // Verify ownership first
  const { data: existing, error: fetchError } = await supabase
    .from("personas")
    .select("id, created_by")
    .eq("slug", slug)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  if (existing.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("personas").delete().eq("slug", slug);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
