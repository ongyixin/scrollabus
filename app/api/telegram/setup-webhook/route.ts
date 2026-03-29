import { setWebhook } from "@/lib/telegram";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/telegram/setup-webhook
 *
 * One-time setup to register the webhook URL with Telegram.
 * Call this once after deployment. Secured by CRON_SECRET.
 *
 * Body: { url?: string } — if omitted, auto-detects from request host.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  let webhookUrl = (body as { url?: string }).url;

  if (!webhookUrl) {
    const host = req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    webhookUrl = `${proto}://${host}/api/telegram/webhook`;
  }

  const ok = await setWebhook(webhookUrl);

  return NextResponse.json({ ok, webhook_url: webhookUrl });
}
