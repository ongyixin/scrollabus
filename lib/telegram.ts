/**
 * Telegram Bot study companion client.
 *
 * Uses the Telegram Bot API directly via fetch — no external dependencies.
 * Set TELEGRAM_BOT_TOKEN in environment variables.
 */

const BOT_API = "https://api.telegram.org/bot";

function getToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN ?? null;
}

function apiUrl(method: string): string {
  return `${BOT_API}${getToken()}/${method}`;
}

export interface TelegramMessage {
  chatId: string | number;
  text: string;
  parseMode?: "Markdown" | "HTML";
}

/**
 * Send a message to a Telegram chat. Fire-and-forget safe.
 */
export async function sendStudyNudge({
  chatId,
  text,
  parseMode,
}: TelegramMessage): Promise<boolean> {
  const token = getToken();
  if (!token) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN not configured — skipping send");
    return false;
  }

  try {
    const res = await fetch(apiUrl("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(parseMode && { parse_mode: parseMode }),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[telegram] API error (${res.status}):`, body);
      return false;
    }

    console.log(`[telegram] Sent nudge to chat ${chatId}`);
    return true;
  } catch (err) {
    console.error("[telegram] Send failed:", err);
    return false;
  }
}

/**
 * Set the webhook URL so Telegram pushes updates to our endpoint.
 */
export async function setWebhook(url: string): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    const res = await fetch(apiUrl("setWebhook"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    console.log("[telegram] setWebhook response:", data);
    return data.ok === true;
  } catch (err) {
    console.error("[telegram] setWebhook failed:", err);
    return false;
  }
}

/**
 * Get info about the bot (useful for building deep links).
 */
export async function getBotInfo(): Promise<{ username: string } | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(apiUrl("getMe"));
    const data = await res.json();
    if (data.ok) {
      return { username: data.result.username };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Inbound message parsing ────────────────────────────────────

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name: string; username?: string };
    chat: { id: number; type: string };
    date: number;
    text?: string;
  };
}

export interface InboundTelegramMessage {
  chatId: number;
  userId: number;
  username: string | undefined;
  text: string;
  timestamp: string;
}

export function parseTelegramUpdate(body: unknown): InboundTelegramMessage | null {
  if (!body || typeof body !== "object") return null;
  const update = body as TelegramUpdate;

  if (!update.message?.text || !update.message.chat) return null;

  return {
    chatId: update.message.chat.id,
    userId: update.message.from.id,
    username: update.message.from.username,
    text: update.message.text.trim(),
    timestamp: new Date(update.message.date * 1000).toISOString(),
  };
}

/**
 * Check if the message is a /start command with a linking token.
 * Deep links look like: /start abc123def456
 */
export function parseStartCommand(text: string): string | null {
  const match = text.match(/^\/start\s+(.+)$/);
  return match ? match[1].trim() : null;
}

// ─── Intent classification (reused from Photon) ─────────────────

export type StudyIntent =
  | "quiz_me"
  | "explain_simpler"
  | "voice_note"
  | "make_meme"
  | "recap"
  | "general_question";

export function classifyStudyIntent(text: string): StudyIntent {
  const lower = text.toLowerCase().trim();

  if (/^\/quiz/.test(lower) || /\bquiz\s*me\b/.test(lower) || lower === "go") return "quiz_me";
  if (/^\/recap/.test(lower) || /\brecap|summary|review|refresh\b/.test(lower)) return "recap";
  if (/^\/explain/.test(lower) || /\bsimpler|easier|eli5\b/.test(lower)) return "explain_simpler";
  if (/\bvoice|audio|sing|song|bard\b/.test(lower)) return "voice_note";
  if (/\bmeme|funny|comic|doodle\b/.test(lower)) return "make_meme";
  return "general_question";
}

/**
 * Generate a random token for deep-link account linking.
 */
export function generateLinkToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 24; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}
