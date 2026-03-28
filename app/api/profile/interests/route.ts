import { createClient } from "@/lib/supabase/server";
import { writeMemory } from "@/lib/hydra";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("interests")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ interests: profile?.interests ?? [] });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { interests } = body;

  if (!Array.isArray(interests)) {
    return NextResponse.json({ error: "interests must be an array" }, { status: 400 });
  }

  const cleaned = interests
    .map((s: unknown) => (typeof s === "string" ? s.trim().toLowerCase() : ""))
    .filter(Boolean);

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ interests: cleaned })
    .eq("id", user.id)
    .select("interests")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget: write learner interests to memory
  const saved = profile?.interests ?? [];
  if (saved.length > 0) {
    writeMemory({
      userId: user.id,
      text: `User's study interests are: ${saved.join(", ")}`,
      infer: false,
    }).catch(() => {});
  }

  return NextResponse.json({ interests: saved });
}
