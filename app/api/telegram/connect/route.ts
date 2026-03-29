import { createClient } from "@/lib/supabase/server";
import { writeMemory } from "@/lib/hydra";
import { getBotInfo, generateLinkToken } from "@/lib/telegram";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/telegram/connect
 * Returns the current user's Telegram connection status and a deep link for linking.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("telegram_chat_id, telegram_enabled, telegram_link_token, telegram_username")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const isLinked = !!profile?.telegram_chat_id;
  let deepLink: string | null = null;

  if (!isLinked) {
    let token = profile?.telegram_link_token;
    if (!token) {
      token = generateLinkToken();
      await supabase
        .from("profiles")
        .update({ telegram_link_token: token })
        .eq("id", user.id);
    }

    const botInfo = await getBotInfo();
    if (botInfo) {
      deepLink = `https://t.me/${botInfo.username}?start=${token}`;
    }
  }

  return NextResponse.json({
    telegram_enabled: profile?.telegram_enabled ?? false,
    telegram_linked: isLinked,
    telegram_username: profile?.telegram_username ?? null,
    deep_link: deepLink,
  });
}

/**
 * POST /api/telegram/connect
 * Toggle Telegram study companion on/off (user must already be linked).
 * Body: { enabled: boolean }
 *
 * Also handles unlinking: { unlink: true }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { enabled, unlink } = body as { enabled?: boolean; unlink?: boolean };

  if (unlink) {
    const { error } = await supabase
      .from("profiles")
      .update({
        telegram_chat_id: null,
        telegram_username: null,
        telegram_enabled: false,
        telegram_link_token: null,
      })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      telegram_enabled: false,
      telegram_linked: false,
      telegram_username: null,
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("telegram_chat_id")
    .eq("id", user.id)
    .single();

  if (enabled && !profile?.telegram_chat_id) {
    return NextResponse.json(
      { error: "Link your Telegram account first by opening the bot link." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ telegram_enabled: enabled ?? false })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (enabled) {
    writeMemory({
      userId: user.id,
      text: `Student enabled Scrollabus study companion on Telegram`,
      infer: false,
    }).catch(() => {});
  }

  return NextResponse.json({
    telegram_enabled: enabled ?? false,
    telegram_linked: !!profile?.telegram_chat_id,
  });
}
