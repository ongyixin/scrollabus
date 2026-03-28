import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
