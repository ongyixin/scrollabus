import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { parsePhotonWebhook, classifyStudyIntent, sendStudyNudge } from "@/lib/photon";
import { recallMemory, writeMemory } from "@/lib/hydra";
import { triggerTeachingWorkflow } from "@/lib/dify";
import { gmiChat } from "@/lib/gmi";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/photon/webhook
 *
 * Receives inbound iMessage/SMS replies from students and routes them to the
 * appropriate learning action. Photon sends a POST request here when a student
 * texts back in response to a study nudge.
 *
 * Supported intents (detected from message text):
 *   quiz_me        → trigger a quiz via Dify, reply with quiz question
 *   explain_simpler → re-explain the last concept with simpler language
 *   voice_note     → generate TTS and send back (ElevenLabs)
 *   make_meme      → generate a meme-format explanation
 *   recap          → quick topic recap
 *   general_question → route to persona DM via Dify, write to memory
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const inbound = parsePhotonWebhook(body);

  if (!inbound) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const { phoneNumber, text } = inbound;

  // Look up the user by phone number
  const serviceClient = createServiceClient();
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("id, display_name, photon_enabled")
    .eq("phone_number", phoneNumber)
    .single();

  if (profileError || !profile) {
    console.warn(`[photon/webhook] No user found for phone ${phoneNumber}`);
    return NextResponse.json({ ok: false, reason: "unknown_user" });
  }

  if (!profile.photon_enabled) {
    return NextResponse.json({ ok: false, reason: "not_opted_in" });
  }

  const userId = profile.id as string;
  const intent = classifyStudyIntent(text);

  // Fire-and-forget: write this interaction to learner memory
  writeMemory({
    userId,
    text: `Student replied via iMessage: "${text}" (intent: ${intent})`,
    infer: true,
  }).catch(() => {});

  let replyText: string;

  switch (intent) {
    case "quiz_me": {
      // Trigger Dify to generate a quiz and send it back
      const result = await triggerTeachingWorkflow({
        eventType: "scheduled_followup",
        userId,
        payload: { phone_number: phoneNumber, action: "quiz" },
      });
      replyText = result.output?.nudge_message as string
        ?? "Opening Scrollabus for your quiz — scrollabus.app";
      break;
    }

    case "explain_simpler": {
      const memories = await recallMemory({
        userId,
        query: "most recent concept studied, last topic reviewed",
        maxResults: 5,
        recencyBias: 0.8,
      });
      const context = memories.join("\n");
      replyText = await gmiChat({
        messages: [
          {
            role: "system",
            content: "You are a friendly study assistant. Explain concepts simply in 2-3 sentences. No markdown, just plain text for SMS.",
          },
          {
            role: "user",
            content: `The student says: "${text}"\n\nRecent study context:\n${context}\n\nGive a simple, clear explanation of the most relevant concept.`,
          },
        ],
        model: "fast",
        maxTokens: 200,
      }).catch(() => "Try opening Scrollabus for a full explanation — your personas are ready!");
      break;
    }

    case "recap": {
      const memories = await recallMemory({
        userId,
        query: "recent study topics and concepts",
        maxResults: 8,
        recencyBias: 0.6,
      });
      replyText = await gmiChat({
        messages: [
          {
            role: "system",
            content: "You are a study recap agent. Write a 3-bullet recap of the student's recent study sessions. Plain text, no markdown, under 300 chars.",
          },
          {
            role: "user",
            content: `Recent learning signals:\n${memories.join("\n")}\n\nWrite a brief recap.`,
          },
        ],
        model: "fast",
        maxTokens: 150,
      }).catch(() => "Check your feed on Scrollabus for a full recap!");
      break;
    }

    case "make_meme":
    case "voice_note":
      // These require the full app — redirect
      replyText = intent === "make_meme"
        ? "Open Scrollabus to see Meme Lord's take — scrollabus.app"
        : "Open Scrollabus to hear Study Bard's audio version — scrollabus.app";
      break;

    default: {
      // General question — route through GMI Cloud with memory context
      const memories = await recallMemory({
        userId,
        query: text,
        maxResults: 6,
        recencyBias: 0.3,
      });
      replyText = await gmiChat({
        messages: [
          {
            role: "system",
            content: "You are Scrollabus, a friendly AI study companion replying via iMessage. Keep replies under 200 chars. Plain text only.",
          },
          {
            role: "user",
            content: `Learner context:\n${memories.join("\n")}\n\nStudent message: "${text}"`,
          },
        ],
        model: "fast",
        maxTokens: 150,
      }).catch(() => "Great question! Open Scrollabus and ask your persona — they're ready to help.");
    }
  }

  // Send the reply back to the student
  await sendStudyNudge({ phoneNumber, text: replyText });

  return NextResponse.json({ ok: true, intent });
}
