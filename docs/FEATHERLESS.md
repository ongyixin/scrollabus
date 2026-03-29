# Featherless AI — LLM Inference in Scrollabus

Scrollabus uses [Featherless AI](https://featherless.ai) as its primary large language model inference provider for all high-volume generation tasks — persona post generation and in-character comment replies. Featherless runs inside n8n workflows, never directly from Next.js.

---

## What Featherless Is

Featherless is a serverless LLM hosting platform that provides flat-rate access to 30,000+ open-weight models via an OpenAI-compatible API. The key property that made it the right choice for Scrollabus is **flat-rate pricing with unlimited tokens**: post generation and comment replies are called many times per material upload and per user interaction, so per-token billing would make costs unpredictable. With Featherless, the monthly cost is fixed regardless of how many posts are generated.

The API is fully OpenAI-compatible. Any code that works with the OpenAI SDK works with Featherless by changing the base URL to `https://api.featherless.ai/v1` and substituting the API key.

---

## Model Used

All Featherless calls in Scrollabus use **`deepseek-ai/DeepSeek-V3.2`**.

DeepSeek-V3.2 is a 685-billion-parameter mixture-of-experts model optimised for instruction following, creative writing, and structured output. It is particularly well-suited for Scrollabus's generation tasks because:

- **Instruction adherence**: persona system prompts are detailed (up to ~300 tokens each) and include strict output format constraints (e.g., JSON-only output for Doodle Prof and Meme Lord). DeepSeek-V3.2 reliably follows these constraints.
- **Voice consistency**: the model maintains persona voice across different academic topics without drifting toward a generic assistant tone.
- **Structured JSON output**: Doodle Prof and Meme Lord system prompts require JSON with specific keys (`title`, `body`). DeepSeek-V3.2 produces parseable JSON consistently.
- **Context window**: 32,768 tokens. Study materials are truncated to 4,000 characters for quiz generation (in `lib/quizzes.ts`) but n8n workflows receive the full `raw_text` — up to several thousand tokens — without needing to truncate.

---

## Where Featherless Is Called

Featherless is called exclusively from n8n workflows via HTTP Request nodes. It is not imported as a package in the Next.js app.

| Workflow | Node | Task | `max_tokens` | `temperature` |
|---|---|---|---|---|
| `1a-sub-text` | Call Featherless (text) | Generate text posts (concept, example, trap, recap) | 512 | 0.7 |
| `2-comment-reply` | Call Featherless | Generate in-character comment reply | 256 | 0.8 |
| `7-reactive-content` | Call Featherless | Generate remedial reactive posts | 512 | 0.75 |
| `8-persona-pulse` | Call Featherless | Generate pulse posts (one per persona) | 512 | 0.75 |

**Note**: Sub-workflows `1b` (image), `1c` (audio TTS), `1d` (audio bard), and `1e` (slideshow) do not call Featherless. Image descriptions and song structures for those post types are produced by Workflow 1's orchestrator Build Prompt node before the sub-workflows are invoked — meaning the LLM call for non-text posts also goes through Featherless, as part of Workflow 1's Build Prompt step, before being passed down to the sub-workflow as structured data.

---

## API Call Structure

All Featherless calls in n8n use the same HTTP Request node configuration:

```
POST https://api.featherless.ai/v1/chat/completions

Headers:
  Authorization: Bearer {{ $vars.FEATHERLESS_API_KEY }}
  Content-Type: application/json

Body:
{
  "model": "deepseek-ai/DeepSeek-V3.2",
  "messages": [
    { "role": "system", "content": {{ $json.system_prompt }} },
    { "role": "user",   "content": {{ $json.user_prompt   }} }
  ],
  "max_tokens": 512,
  "temperature": 0.7
}
```

The `system_prompt` contains the full persona instruction (fetched from Supabase's `personas.system_prompt` column). The `user_prompt` contains the study material context, the post type instruction, and any emphasis signal from the Dify teaching plan.

---

## Prompt Design Per Workflow

### Text Post Generation (Workflow 1a)

Each persona's system prompt was authored to produce output that:
1. Is concise enough to fit a mobile card (under 200 words)
2. Uses the persona's distinct voice consistently
3. Ends with a hook or interactive element (question, call-to-action)
4. Includes a short title as the first element

For example, the Exam Gremlin system prompt instructs the model to open with "Don't fall for this:" or "Common mistake:", identify the academic trap in the material, and explain the correct reasoning in 2–3 short paragraphs. Featherless reliably produces output in this format across diverse academic topics.

For personas that produce structured JSON (Doodle Prof, Meme Lord, Study Bard), the system prompt ends with:
> Return ONLY valid JSON, no markdown fences.

The n8n Parse node after the Featherless call strips any accidental prose and attempts `JSON.parse`. If parsing fails, the post is skipped rather than inserting malformed content.

### Comment Reply Generation (Workflow 2)

Comment replies use a shorter `max_tokens` (256) and higher `temperature` (0.8) because:
- Replies should feel spontaneous and conversational, not like a formal post
- Higher temperature introduces the natural variation that makes replies feel authored by a personality rather than a machine

The user prompt includes:
- The original post title and body (so the persona knows what they wrote)
- The student's comment text
- The `learner_context` field from Next.js (a short string summarising the student's profile, injected by `/api/comments`)

The system prompt for comment replies is the same persona `system_prompt` stored in Supabase — the same voice used for post generation — with an additional instruction appended by Workflow 2's Build Reply Prompt Code node:

> You are now responding to a comment on one of your posts. Keep your reply short (2–4 sentences), stay in character, and address the student's question or observation directly.

### Reactive Content Generation (Workflow 7)

Reactive posts target identified weak spots. The user prompt includes the quiz failure hotspot data — topics where a significant proportion of students answered incorrectly — and instructs Featherless to write a post that re-explains that concept from a different angle than the original post.

`temperature` is set to 0.75 (between text posts and comment replies) to allow creative re-framing while still producing coherent explanations.

### Persona Pulse Generation (Workflow 8)

Pulse posts are the most open-ended generation task. The user prompt includes aggregate engagement data and instructs Featherless to write as the persona "checking in" with the community — acknowledging what students have been studying, noting common struggles, and offering encouragement or a provocative observation.

These posts are intentionally more variable (temperature 0.75) because their value comes from feeling fresh and topical rather than following a rigid template.

---

## Why Featherless Over Direct API Calls in Next.js

Featherless is not called from Next.js route handlers. All calls go through n8n for these reasons:

1. **Decoupling latency from the user request**: generating 20–30 posts from a material upload takes 30–120 seconds. Keeping this inside n8n means the Next.js `/api/materials` route returns immediately and the student sees posts populate as they are inserted.

2. **Centralised credential management**: `FEATHERLESS_API_KEY` lives as an n8n variable and never appears in the Next.js environment. This limits the blast radius if the Next.js deployment is compromised.

3. **Retry and error handling**: n8n's HTTP Request node has configurable retry behaviour. If Featherless returns a 429 (rate limit) or 5xx, n8n retries automatically. Implementing the same robustness in a Next.js API route would require a queue or background job system.

4. **Cost visibility**: all Featherless calls are visible in n8n's Executions log with timestamps, input/output sizes, and response times. This provides an audit trail for generation costs and quality monitoring that would be hard to replicate in serverless Next.js.

---

## Featherless vs. Other Inference Providers in Scrollabus

Scrollabus uses multiple AI providers. Here is how they are divided:

| Task | Provider | Reason |
|---|---|---|
| Post generation (text) | Featherless / DeepSeek-V3.2 | Flat-rate pricing; strong instruction following; runs in n8n |
| Comment replies | Featherless / DeepSeek-V3.2 | Same as above; short context, low latency |
| Reactive / pulse posts | Featherless / DeepSeek-V3.2 | Same as above |
| PDF parsing (vision) | Gemini 2.5 Flash | Native multimodal — required for scanned PDFs |
| Quiz generation | Gemini 2.5 Flash | JSON mode reliability; runs synchronously in Next.js |
| Quiz chat (hints) | Gemini 2.5 Flash | Stateful chat API; Socratic guardrails |
| DM chat | Gemini 2.0 Flash | Stateful multi-turn chat; runs in Next.js |
| Image generation | Gemini Imagen (Nano Banana 2) | Native Google Imagen API; best quality for educational diagrams |
| TTS narration | ElevenLabs (in-app) / Gemini TTS (n8n) | ElevenLabs for high-quality in-app TTS; Gemini TTS for batch audio in n8n |
| Song generation | Lyria 3 | Native music/audio model for Study Bard songs |
| Teaching agent | GMI Cloud (DeepSeek/Llama) | Dify requires an OpenAI-compatible endpoint; GMI provides this |
| Telegram responses | GMI Cloud (DeepSeek-V3-0324) | Low-latency chat responses for Telegram bot |

The principle: Featherless handles everything that is **high-volume, persona-voiced, and asynchronous**. Gemini handles everything that requires **multimodal input, stateful chat, or synchronous response in a user-facing API route**.

---

## Setting Up Featherless

1. Create an account at [featherless.ai](https://featherless.ai).
2. Subscribe to a plan — the **Premium** plan ($25/month) provides access to DeepSeek-V3.2 with 4 concurrent connections and 32K context.
3. Generate an API key from the dashboard.
4. Add the key as an n8n variable named `FEATHERLESS_API_KEY` (not in `.env.local`).
5. Verify the key is working by running Workflow 2 manually with a test payload.

---

## Troubleshooting

**Featherless returns `401 Unauthorized`**
- The `FEATHERLESS_API_KEY` n8n variable is empty or incorrect.
- Confirm the variable name matches exactly: `$vars.FEATHERLESS_API_KEY`.

**Posts are generated but body is empty or malformed**
- The model returned valid JSON but with unexpected keys. Check the Parse Code node in the relevant sub-workflow — it extracts `title` and `body` from the JSON. If the model uses different key names, update the Parse node.
- For Doodle Prof and Meme Lord, the model sometimes wraps JSON in a markdown fence despite the instruction. Add a pre-parse step in the Code node to strip ```json ... ``` if present.

**Comment replies are too long or break character**
- Reduce `max_tokens` to 200 and adjust the system prompt to reinforce brevity and voice.
- The `learner_context` string passed from Next.js should be short (under 100 characters). If it is very long, it can dilute the persona voice.

**Featherless returns `429 Too Many Requests`**
- The Premium plan has 4 concurrent connections. Workflow 1 fans out to 5 sub-workflows simultaneously — if all sub-workflows call Featherless at the same moment, a fifth concurrent request may be queued.
- Enable retry in the HTTP Request nodes (n8n supports automatic retry with exponential backoff under **Options → Retry On Fail**).
- Alternatively, upgrade to the Max plan for 8 concurrent connections.

**Reactive or pulse posts sound generic**
- The user prompt may not be providing enough topic specificity. In Workflow 7's Build Reactive Prompt Code node, ensure the quiz failure topic string is included directly in the prompt, not just referenced as a variable name.
