import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profileResult, materialsResult, savesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("materials")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("saves")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  if (profileResult.error) {
    return NextResponse.json({ error: profileResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: {
      ...profileResult.data,
      email: user.email,
    },
    stats: {
      materials: materialsResult.count ?? 0,
      saves: savesResult.count ?? 0,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (typeof body.display_name === "string") {
    updates.display_name = body.display_name.trim() || null;
  }
  if (typeof body.bio === "string") {
    updates.bio = body.bio.trim() || null;
  }
  if (typeof body.avatar_url === "string") {
    updates.avatar_url = body.avatar_url || null;
  }
  if (typeof body.enable_av_output === "boolean") {
    updates.enable_av_output = body.enable_av_output;
  }
  if (Array.isArray(body.enabled_personas)) {
    const VALID_SLUGS = ["lecture-bestie", "exam-gremlin", "problem-grinder", "doodle-prof", "meme-lord", "study-bard"];
    const filtered = (body.enabled_personas as unknown[]).filter(
      (s): s is string => typeof s === "string" && VALID_SLUGS.includes(s)
    );
    // Always keep at least one persona enabled
    updates.enabled_personas = filtered.length > 0 ? filtered : VALID_SLUGS;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: { ...profile, email: user.email } });
}
