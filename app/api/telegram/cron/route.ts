import { createServiceClient } from "@/lib/supabase/service";
import { recallMemory } from "@/lib/hydra";
import { triggerTeachingWorkflow } from "@/lib/dify";
import { sendStudyNudge } from "@/lib/telegram";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/telegram/cron
 *
 * Scheduled cron job that sends personalized study nudges via Telegram
 * to all students who have opted in.
 *
 * Vercel cron config:
 * { "crons": [{ "path": "/api/telegram/cron", "schedule": "0 18 * * *" }] }
 *
 * Secured by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  const { data: users, error } = await serviceClient
    .from("profiles")
    .select("id, telegram_chat_id, display_name")
    .eq("telegram_enabled", true)
    .not("telegram_chat_id", "is", null);

  if (error) {
    console.error("[telegram/cron] Failed to fetch users:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{
    userId: string;
    status: "sent" | "skipped" | "error";
  }> = [];

  for (const user of users ?? []) {
    try {
      const memories = await recallMemory({
        userId: user.id as string,
        query:
          "weak concepts, things not reviewed recently, upcoming exams, repeated mistakes",
        maxResults: 10,
        recencyBias: 0.4,
      });

      if (memories.length === 0) {
        results.push({ userId: user.id as string, status: "skipped" });
        continue;
      }

      const workflowResult = await triggerTeachingWorkflow({
        eventType: "scheduled_followup",
        userId: user.id as string,
        payload: {
          telegram_chat_id: user.telegram_chat_id,
          memories,
          display_name: user.display_name,
        },
      });

      const nudgeText =
        (workflowResult.output?.nudge_message as string) ??
        "Time to study! Open Scrollabus to continue where you left off. 📖";

      const sent = await sendStudyNudge({
        chatId: user.telegram_chat_id as string,
        text: nudgeText,
      });

      results.push({
        userId: user.id as string,
        status: sent ? "sent" : "error",
      });
    } catch (err) {
      console.error(`[telegram/cron] Failed for user ${user.id}:`, err);
      results.push({ userId: user.id as string, status: "error" });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "error").length;

  console.log(
    `[telegram/cron] Done: ${sent} sent, ${skipped} skipped, ${failed} errors`
  );
  return NextResponse.json({ sent, skipped, failed });
}
