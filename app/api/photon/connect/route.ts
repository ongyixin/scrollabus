import { createClient } from "@/lib/supabase/server";
import { writeMemory } from "@/lib/hydra";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/photon/connect
 * Returns the current user's Photon connection status (phone number + enabled flag).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("phone_number, photon_enabled")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    phone_number: profile?.phone_number ?? null,
    photon_enabled: profile?.photon_enabled ?? false,
  });
}

/**
 * POST /api/photon/connect
 * Link a phone number and opt into the Photon study companion.
 * Body: { phone_number: string, enabled: boolean }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { phone_number, enabled } = body as { phone_number?: string; enabled?: boolean };

  if (enabled && (!phone_number || !phone_number.trim())) {
    return NextResponse.json({ error: "phone_number is required to enable study companion" }, { status: 400 });
  }

  // Basic E.164 format validation when enabling
  const cleaned = phone_number?.replace(/\s/g, "") ?? null;
  if (enabled && cleaned && !/^\+?\d{7,15}$/.test(cleaned)) {
    return NextResponse.json({ error: "Invalid phone number — use international format e.g. +1234567890" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    photon_enabled: enabled ?? false,
  };
  if (cleaned !== undefined) updates.phone_number = enabled ? cleaned : null;

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget: write opt-in signal to memory
  if (enabled) {
    writeMemory({
      userId: user.id,
      text: `Student enabled Scrollabus study companion on iMessage/SMS (phone: ${cleaned})`,
      infer: false,
    }).catch(() => {});
  }

  return NextResponse.json({ phone_number: enabled ? cleaned : null, photon_enabled: enabled ?? false });
}
