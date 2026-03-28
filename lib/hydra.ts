import { HydraDBClient } from "@hydra_db/node";

const TENANT_ID = process.env.HYDRADB_TENANT_ID ?? "scrollabus";

function getClient(): HydraDBClient | null {
  const token = process.env.HYDRADB_API_KEY;
  if (!token) {
    console.warn("[hydra] HYDRADB_API_KEY not configured — memory ops skipped");
    return null;
  }
  return new HydraDBClient({ token });
}

/**
 * Write a learner memory for a given user (fire-and-forget safe).
 * `text` describes what the user did/learned in plain language.
 * Set `infer: true` to let HydraDB extract preferences and insights automatically.
 */
export async function writeMemory({
  userId,
  text,
  infer = true,
}: {
  userId: string;
  text: string;
  infer?: boolean;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.upload.addMemory({
      memories: [{ text, infer }],
      tenant_id: TENANT_ID,
      sub_tenant_id: userId,
      upsert: true,
    });
  } catch (err) {
    console.error("[hydra] writeMemory failed:", err);
  }
}

/**
 * Write a learner memory from a user/assistant conversation pair.
 * Lets HydraDB infer preferences and learning patterns from the exchange.
 */
export async function writeConversationMemory({
  userId,
  userMessage,
  assistantMessage,
}: {
  userId: string;
  userMessage: string;
  assistantMessage: string;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.upload.addMemory({
      memories: [
        {
          user_assistant_pairs: [
            { user: userMessage, assistant: assistantMessage },
          ],
          infer: true,
        },
      ],
      tenant_id: TENANT_ID,
      sub_tenant_id: userId,
      upsert: true,
    });
  } catch (err) {
    console.error("[hydra] writeConversationMemory failed:", err);
  }
}

/**
 * Recall relevant learner memories for a user based on a query.
 * Returns up to `maxResults` memory text strings, or an empty array on failure.
 */
export async function recallMemory({
  userId,
  query,
  maxResults = 10,
  recencyBias = 0.3,
}: {
  userId: string;
  query: string;
  maxResults?: number;
  recencyBias?: number;
}): Promise<string[]> {
  const client = getClient();
  if (!client) return [];

  try {
    const result = await client.recall.recallPreferences({
      query,
      tenant_id: TENANT_ID,
      sub_tenant_id: userId,
      alpha: 0.8,
      recency_bias: recencyBias,
      max_results: maxResults,
    });

    // RetrievalResult has `chunks` (VectorStoreChunk[]) — extract chunk_content
    const chunks = result?.chunks ?? [];
    return chunks.map((c) => c.chunk_content).filter(Boolean);
  } catch (err) {
    console.error("[hydra] recallMemory failed:", err);
    return [];
  }
}

/**
 * Format recalled memories into a concise system prompt block.
 * Returns an empty string if there are no memories.
 */
export function formatMemoryContext(memories: string[]): string {
  if (memories.length === 0) return "";
  return `\n\nLEARNER CONTEXT (from memory):\n${memories.map((m, i) => `${i + 1}. ${m}`).join("\n")}`;
}
