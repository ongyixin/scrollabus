import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const interestFilter = searchParams.get("interest");
  const limitParam = searchParams.get("limit");
  const limit = Math.min(parseInt(limitParam ?? "20", 10) || 20, 50);

  // Get current user's interests first
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("interests")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const userInterests: string[] = profile?.interests ?? [];

  // If no interests set, return empty
  if (userInterests.length === 0) {
    return NextResponse.json({ users: [], userInterests: [] });
  }

  // Optionally narrow to a specific interest
  const interestsToMatch = interestFilter
    ? userInterests.filter((i) => i.toLowerCase().includes(interestFilter.toLowerCase()))
    : userInterests;

  if (interestsToMatch.length === 0) {
    return NextResponse.json({ users: [], userInterests });
  }

  const { data: similarUsers, error } = await supabase.rpc("get_similar_users", {
    user_interests: interestsToMatch,
    exclude_user_id: user.id,
    limit_count: limit,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: similarUsers ?? [], userInterests });
}
