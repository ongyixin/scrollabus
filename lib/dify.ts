import { DIFY_CONFIG } from "./constants";

export type DifyEventType =
  | "material_uploaded"
  | "comment_posted"
  | "feed_opened"
  | "scheduled_followup";

export interface DifyWorkflowResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
}

/**
 * Trigger the Scrollabus teaching workflow in Dify.
 *
 * The workflow is built in the Dify UI with four event_type branches:
 *   - material_uploaded: classify prior knowledge, generate personalized teaching plan
 *   - comment_posted: generate memory-aware persona reply
 *   - feed_opened: surface weak/stale concepts from learner memory
 *   - scheduled_followup: generate a Telegram nudge (quiz, recap, reminder)
 *
 * Returns the workflow output on success, or { success: false } if not configured.
 */
export async function triggerTeachingWorkflow({
  eventType,
  userId,
  payload,
}: {
  eventType: DifyEventType;
  userId: string;
  payload: Record<string, unknown>;
}): Promise<DifyWorkflowResult> {
  const { apiUrl, apiKey } = DIFY_CONFIG;
  if (!apiKey) {
    console.warn("[dify] DIFY_API_KEY not configured — skipping workflow");
    return { success: false, error: "not_configured" };
  }

  try {
    const res = await fetch(`${apiUrl}/workflows/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: {
          event_type: eventType,
          user_id: userId,
          payload: JSON.stringify(payload),
        },
        response_mode: "blocking",
        user: userId,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[dify] Workflow error (${res.status}):`, text);
      return { success: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json() as {
      data?: { outputs?: Record<string, unknown>; status?: string };
    };

    const outputs = data.data?.outputs ?? {};
    return { success: true, output: outputs };
  } catch (err) {
    console.error("[dify] triggerTeachingWorkflow failed:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Extract a string field from a Dify workflow output.
 * Handles the common case where Dify wraps output in an `answer` or `text` key.
 */
export function extractDifyText(
  result: DifyWorkflowResult,
  key = "answer"
): string | null {
  if (!result.success || !result.output) return null;
  const val = result.output[key] ?? result.output["text"] ?? result.output["result"];
  return typeof val === "string" ? val : null;
}
