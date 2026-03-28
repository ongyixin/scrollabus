import { createServiceClient } from "@/lib/supabase/service";
import { recallMemory } from "@/lib/hydra";
import { triggerTeachingWorkflow } from "@/lib/dify";
import { sendStudyNudge } from "@/lib/photon";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/photon/cron
 *
 * Scheduled cron job that sends personalized study nudges to all students
 * who have opted into the Photon study companion.
 *
 * Deploy on Vercel with a cron trigger in vercel.json:
 * {
 *   "crons": [{ "path": "/api/photon/cron", "schedule": "0 18 * * *" }]
 * }
 * (runs daily at 6pm UTC — adjust to your users' timezone)
 *
 * Secured by CRON_SECRET header (set in Vercel environment variables).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Fetch all users with Photon enabled
  const { data: users, error } = await serviceClient
    .from("profiles")
    .select("id, phone_number, display_name")
    .eq("photon_enabled", true)
    .not("phone_number", "is", null);

  if (error) {
    console.error("[photon/cron] Failed to fetch users:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ userId: string; status: "sent" | "skipped" | "error" }> = [];

  for (const user of users ?? []) {
    try {
      // Recall learner memory to check for stale/weak concepts
      const memories = await recallMemory({
        userId: user.id as string,
        query: "weak concepts, things not reviewed recently, upcoming exams, repeated mistakes",
        maxResults: 10,
        recencyBias: 0.4,
      });

      if (memories.length === 0) {
        results.push({ userId: user.id as string, status: "skipped" });
        continue;
      }

      // Ask Dify to generate a personalized nudge
      const workflowResult = await triggerTeachingWorkflow({
        eventType: "scheduled_followup",
        userId: user.id as string,
        payload: {
          phone_number: user.phone_number,
          memories,
          display_name: user.display_name,
        },
      });

      const nudgeText =
        (workflowResult.output?.nudge_message as string) ??
        "Time to study! Open Scrollabus to continue where you left off.";

      const sent = await sendStudyNudge({
        phoneNumber: user.phone_number as string,
        text: nudgeText,
      });

      results.push({ userId: user.id as string, status: sent ? "sent" : "error" });
    } catch (err) {
      console.error(`[photon/cron] Failed for user ${user.id}:`, err);
      results.push({ userId: user.id as string, status: "error" });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "error").length;

  console.log(`[photon/cron] Done: ${sent} sent, ${skipped} skipped, ${failed} errors`);
  return NextResponse.json({ sent, skipped, failed });
}
