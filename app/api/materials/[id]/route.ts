import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify the material belongs to this user
  const { data: material } = await supabase
    .from("materials")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!material) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const service = createServiceClient();

  // Delete associated posts first (schema uses on delete set null, not cascade)
  const { error: postsError } = await service
    .from("posts")
    .delete()
    .eq("material_id", id);

  if (postsError) {
    return NextResponse.json({ error: postsError.message }, { status: 500 });
  }

  // Delete the material itself
  const { error: materialError } = await service
    .from("materials")
    .delete()
    .eq("id", id);

  if (materialError) {
    return NextResponse.json({ error: materialError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
