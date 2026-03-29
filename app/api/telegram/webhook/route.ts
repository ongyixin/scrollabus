import { createServiceClient } from "@/lib/supabase/service";
import {
  parseTelegramUpdate,
  parseStartCommand,
  classifyStudyIntent,
  sendStudyNudge,
} from "@/lib/telegram";
import { recallMemory, writeMemory } from "@/lib/hydra";
import { triggerTeachingWorkflow } from "@/lib/dify";
import { gmiChat } from "@/lib/gmi";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/telegram/webhook
 *
 * Receives updates from Telegram Bot API. Handles two flows:
 * 1. /start TOKEN → links the Telegram account to a Scrollabus user
 * 2. Regular messages → routes to study intents (quiz, explain, recap, etc.)
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const inbound = parseTelegramUpdate(body);

  if (!inbound) {
    return NextResponse.json({ ok: true });
  }

  const { chatId, text, username } = inbound;
  const serviceClient = createServiceClient();

  // ─── /start deep-link account linking ───
  const linkToken = parseStartCommand(text);
  if (linkToken) {
    const { data: profile, error } = await serviceClient
      .from("profiles")
      .select("id, display_name")
      .eq("telegram_link_token", linkToken)
      .single();

    if (error || !profile) {
      await sendStudyNudge({
        chatId,
        text: "Hmm, that link doesn't seem valid. Try generating a new one from your Scrollabus profile.",
      });
      return NextResponse.json({ ok: true });
    }

    await serviceClient
      .from("profiles")
      .update({
        telegram_chat_id: String(chatId),
        telegram_username: username ?? null,
        telegram_enabled: true,
        telegram_link_token: null,
      })
      .eq("id", profile.id);

    const name = profile.display_name || "there";
    await sendStudyNudge({
      chatId,
      text: `Hey ${name}! 🎓 Your Scrollabus study companion is now connected.\n\nI'll send you daily study nudges and you can reply anytime with:\n• "quiz me" — get a quick quiz\n• "explain simpler" — re-explain the last topic\n• "recap" — summarize recent study sessions\n\nLet's get studying!`,
    });

    return NextResponse.json({ ok: true });
  }

  // ─── Handle /start without a token ───
  if (text === "/start") {
    await sendStudyNudge({
      chatId,
      text: "Welcome to Scrollabus! 📚\n\nTo connect this bot to your account, go to your Scrollabus profile → Study Companion and tap the Telegram link button.",
    });
    return NextResponse.json({ ok: true });
  }

  // ─── Regular message: look up user by chat_id ───
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("id, display_name, telegram_enabled")
    .eq("telegram_chat_id", String(chatId))
    .single();

  if (profileError || !profile) {
    await sendStudyNudge({
      chatId,
      text: "I don't recognize this chat. Link your account first from your Scrollabus profile → Study Companion.",
    });
    return NextResponse.json({ ok: true });
  }

  if (!profile.telegram_enabled) {
    await sendStudyNudge({
      chatId,
      text: "Your study companion is paused. Turn it back on from your Scrollabus profile.",
    });
    return NextResponse.json({ ok: true });
  }

  const userId = profile.id as string;
  const intent = classifyStudyIntent(text);

  writeMemory({
    userId,
    text: `Student replied via Telegram: "${text}" (intent: ${intent})`,
    infer: true,
  }).catch(() => {});

  let replyText: string;

  switch (intent) {
    case "quiz_me": {
      const result = await triggerTeachingWorkflow({
        eventType: "scheduled_followup",
        userId,
        payload: { telegram_chat_id: String(chatId), action: "quiz" },
      });
      replyText =
        (result.output?.nudge_message as string) ??
        "Opening Scrollabus for your quiz — scrollabus.app";
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
            content:
              "You are a friendly study assistant. Explain concepts simply in 2-3 sentences. Plain text only.",
          },
          {
            role: "user",
            content: `The student says: "${text}"\n\nRecent study context:\n${context}\n\nGive a simple, clear explanation of the most relevant concept.`,
          },
        ],
        model: "fast",
        maxTokens: 200,
      }).catch(
        () =>
          "Try opening Scrollabus for a full explanation — your personas are ready!"
      );
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
            content:
              "You are a study recap agent. Write a 3-bullet recap of the student's recent study sessions. Plain text, under 300 chars.",
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
      replyText =
        intent === "make_meme"
          ? "Open Scrollabus to see Meme Lord's take — scrollabus.app"
          : "Open Scrollabus to hear Study Bard's audio version — scrollabus.app";
      break;

    default: {
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
            content:
              "You are Scrollabus, a friendly AI study companion replying via Telegram. Keep replies concise. Plain text only.",
          },
          {
            role: "user",
            content: `Learner context:\n${memories.join("\n")}\n\nStudent message: "${text}"`,
          },
        ],
        model: "fast",
        maxTokens: 150,
      }).catch(
        () =>
          "Great question! Open Scrollabus and ask your persona — they're ready to help."
      );
    }
  }

  await sendStudyNudge({ chatId, text: replyText });

  return NextResponse.json({ ok: true, intent });
}
