import { GMI_CONFIG } from "./constants";

export type GmiModel = "fast" | "reasoning";

export interface GmiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GmiResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

/**
 * Call GMI Cloud's OpenAI-compatible chat completions endpoint.
 * Use `fast` for routine generation, `reasoning` for deep analysis and quiz diagnosis.
 */
export async function gmiChat({
  messages,
  model = "fast",
  temperature = 0.7,
  maxTokens,
  jsonMode = false,
}: {
  messages: GmiMessage[];
  model?: GmiModel;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<string> {
  const apiKey = GMI_CONFIG.apiKey;
  if (!apiKey) {
    throw new Error("[gmi] GMI_CLOUD_API_KEY not configured");
  }

  const modelId = GMI_CONFIG.models[model];

  const body: Record<string, unknown> = {
    model: modelId,
    messages,
    temperature,
  };
  if (maxTokens) body.max_tokens = maxTokens;
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(`${GMI_CONFIG.apiUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[gmi] API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as GmiResponse;
  return data.choices[0]?.message?.content ?? "";
}

/**
 * List available models on GMI Cloud (useful for debugging/verification).
 */
export async function listGmiModels(): Promise<string[]> {
  const apiKey = GMI_CONFIG.apiKey;
  if (!apiKey) return [];

  try {
    const res = await fetch(`${GMI_CONFIG.apiUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return [];
    const data = await res.json() as { data: Array<{ id: string }> };
    return (data.data ?? []).map((m) => m.id);
  } catch {
    return [];
  }
}
