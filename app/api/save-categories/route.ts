import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Supabase returns aggregate as [{ count: string }]; flatten to a plain number.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalise(cat: any) {
  return {
    ...cat,
    post_count: Array.isArray(cat.post_count)
      ? Number(cat.post_count[0]?.count ?? 0)
      : 0,
  };
}

// GET /api/save-categories — list user's categories (auto-creates "Favorites" on first call)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: categories, error } = await supabase
    .from("save_categories")
    .select("*, post_count:save_category_memberships(count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-create "Favorites" if the user has no categories yet
  if (!categories || categories.length === 0) {
    const { data: created, error: createError } = await supabase
      .from("save_categories")
      .insert({ user_id: user.id, name: "Favorites" })
      .select("*, post_count:save_category_memberships(count)")
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ categories: [normalise(created)] });
  }

  return NextResponse.json({ categories: categories.map(normalise) });
}

// POST /api/save-categories — create a new category
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const { data: category, error } = await supabase
    .from("save_categories")
    .insert({ user_id: user.id, name: name.trim() })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ category });
}
