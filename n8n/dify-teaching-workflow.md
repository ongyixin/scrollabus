# Dify Teaching Workflow — Scrollabus

Build this workflow in the Dify UI, then set `DIFY_API_KEY` in `.env.local` to the workflow's API key.
Configure GMI Cloud as an OpenAI-compatible model provider in Dify:
- **API Base URL:** `https://api.gmi-serving.com/v1`
- **API Key:** your GMI Cloud key
- **Fast model:** `deepseek-ai/DeepSeek-V3-0324` (use for most generation)
- **Reasoning model:** `deepseek-ai/DeepSeek-R1-0528` (use for misconception diagnosis, teaching plan)

---

## Workflow Inputs

| Variable | Type | Description |
|---|---|---|
| `event_type` | string | One of: `material_uploaded`, `comment_posted`, `feed_opened`, `scheduled_followup` |
| `user_id` | string | Scrollabus user UUID (used as HydraDB `sub_tenant_id`) |
| `payload` | string (JSON) | Event-specific context (see branches below) |

---

## Node Structure

```
[Start]
  └── [Code: parse payload JSON]
        └── [If/Switch: branch on event_type]
              ├── material_uploaded  → [Branch A]
              ├── comment_posted     → [Branch B]
              ├── feed_opened        → [Branch C]
              └── scheduled_followup → [Branch D]
```

---

## Branch A: material_uploaded

**Goal:** Classify what the learner already knows about this topic and generate a personalized teaching plan.

### Nodes

1. **HTTP Request — Recall learner memory**
   - Method: `POST`
   - URL: `https://api.usecortex.ai/recall/recall_preferences`
   - Headers: `Authorization: Bearer {{env.HYDRADB_API_KEY}}`
   - Body:
     ```json
     {
       "query": "What does this student already know about {{payload.title}}? Any prior knowledge, misconceptions, or goals?",
       "tenant_id": "scrollabus",
       "sub_tenant_id": "{{user_id}}",
       "alpha": 0.8,
       "max_results": 10
     }
     ```
   - Output: `memory_results`

2. **LLM — Classify prior knowledge** (GMI Cloud `deepseek-ai/DeepSeek-R1-0528`)
   - System: `You are a learning analytics expert. Based on the learner's memory and the new material, assess their current understanding.`
   - User prompt:
     ```
     Material: {{payload.title}}
     Topic preview: {{payload.topic_preview}}
     
     Learner memory:
     {{memory_results}}
     
     Classify the learner's prior knowledge as: beginner / familiar / advanced.
     List any relevant misconceptions you detect from memory.
     Output JSON: { "prior_knowledge": "...", "misconceptions": [...], "focus_areas": [...] }
     ```
   - Output: `knowledge_profile`

3. **LLM — Generate teaching plan** (GMI Cloud `deepseek-ai/DeepSeek-R1-0528`)
   - System: `You are a pedagogical planning agent for Scrollabus, a memory-native AI study tool. Scrollabus has six teaching personas: Lecture Bestie (friendly explanations), Exam Gremlin (trap spotting), Problem Grinder (worked examples), Doodle Prof (visual comics), Meme Lord (meme-format), Study Bard (music/songs).`
   - User prompt:
     ```
     Material: {{payload.title}}
     Knowledge profile: {{knowledge_profile}}
     
     Generate a teaching plan:
     1. Which personas are most useful for this material and why?
     2. What should be emphasized given their misconceptions?
     3. What concept should be reviewed first (most weak/confused)?
     4. Suggest a follow-up quiz topic.
     
     Output JSON: { "priority_personas": [...], "emphasis": "...", "first_review_concept": "...", "quiz_topic": "..." }
     ```
   - Output: `teaching_plan`

4. **HTTP Request — Write teaching plan to HydraDB**
   - Method: `POST`
   - URL: `https://api.usecortex.ai/memories/add_memory`
   - Body:
     ```json
     {
       "memories": [{ "text": "Teaching plan for {{payload.title}}: {{teaching_plan}}", "infer": false }],
       "tenant_id": "scrollabus",
       "sub_tenant_id": "{{user_id}}",
       "upsert": true
     }
     ```

5. **End** — Output: `{ "teaching_plan": teaching_plan, "knowledge_profile": knowledge_profile }`

---

## Branch B: comment_posted

**Goal:** Generate a memory-aware persona reply to a student comment.

> **Note:** This branch is an alternative to the n8n `workflow-2-comment-reply.json` path.
> Currently the app calls n8n for comment replies. This Dify branch can supplement or replace it.

### Nodes

1. **HTTP Request — Recall learner memory** (same pattern as Branch A)
   - Query: `{{payload.comment_body}}`
   - `max_results: 8`

2. **LLM — Generate memory-aware reply** (GMI Cloud `deepseek-ai/DeepSeek-V3-0324`)
   - System: persona system prompt from `payload.persona_slug`
   - User prompt:
     ```
     Student asked: {{payload.comment_body}}
     
     Learner context from memory:
     {{memory_results}}
     
     Reply as this persona, taking into account what you know about this learner.
     Keep it concise, in character, and address any known misconceptions.
     ```
   - Output: `reply_text`

3. **HTTP Request — Write interaction to HydraDB** (`POST https://api.usecortex.ai/memories/add_memory`)
   - Body: `{ "memories": [{ "user_assistant_pairs": [{ "user": "{{payload.comment_body}}", "assistant": "{{reply_text}}" }], "infer": true }], "tenant_id": "scrollabus", "sub_tenant_id": "{{user_id}}" }`

4. **End** — Output: `{ "reply": reply_text }`

---

## Branch C: feed_opened

**Goal:** Identify stale/weak concepts from memory and flag them for prioritization.

### Nodes

1. **LLM — Analyze weak concepts** (GMI Cloud `deepseek-ai/DeepSeek-V3-0324`)
   - System: `You are a spaced repetition and learning analytics agent.`
   - User prompt:
     ```
     The student just opened their study feed. Based on their recent memory signals:
     {{payload.weak_concepts}}
     
     Identify:
     1. The top concept they should review urgently (most confused or most stale).
     2. A suggested follow-up action: quiz / recap / re-read / ask persona.
     
     Output JSON: { "urgent_review": "...", "action": "quiz|recap|re-read|ask_persona", "message": "short nudge message for the student" }
     ```
   - Output: `review_suggestion`

2. **End** — Output: `{ "review_suggestion": review_suggestion }`

---

## Branch D: scheduled_followup

**Goal:** Generate a personalized Telegram study nudge for a student.

### Nodes

1. **HTTP Request — Recall learner memory** (`POST https://api.usecortex.ai/recall/recall_preferences`)
   - Query: `"things the student hasn't reviewed recently, weak concepts, upcoming goals"`
   - `max_results: 10`, `recency_bias: 0.5`

2. **LLM — Generate nudge** (GMI Cloud `deepseek-ai/DeepSeek-V3-0324`)
   - System: `You are Scrollabus, a friendly AI study companion. Write a short, conversational Telegram message to nudge a student to study. Keep it under 200 characters. Be warm, specific, and include a call to action.`
   - User prompt:
     ```
     Learner memory:
     {{memory_results}}
     
     Generate ONE study nudge message. Choose the most relevant topic from their memory.
     Examples:
     - "You've mixed up mitosis and meiosis twice. Want a quick comic or quiz? Reply 'quiz me' or 'explain simpler'"
     - "Exam in 3 days? Here's a 2-min trap review on glycolysis. Reply 'go' to start"
     - "You saved supply/demand notes 5 days ago but never revisited. Quick refresher? Reply 'yes'"
     ```
   - Output: `nudge_message`

3. **End** — Output: `{ "nudge_message": nudge_message }`

---

## Calling This Workflow from Next.js

The app calls `triggerTeachingWorkflow()` from `lib/dify.ts`:

```typescript
// On material upload (materials API route)
triggerTeachingWorkflow({
  eventType: "material_uploaded",
  userId: user.id,
  payload: { material_id, title, source_type, topic_preview: raw_text.slice(0, 500) },
});

// On feed open (feed API route, first page only)
triggerTeachingWorkflow({
  eventType: "feed_opened",
  userId: user.id,
  payload: { weak_concepts: memories },
});

// For Telegram nudges (cron job via /api/telegram/cron)
triggerTeachingWorkflow({
  eventType: "scheduled_followup",
  userId: user.id,
  payload: { telegram_chat_id: profile.telegram_chat_id, display_name: profile.display_name },
});
```

---

## Setup Checklist

1. Create a new Workflow app in Dify
2. Add GMI Cloud as a custom model provider (OpenAI-compatible)
3. Build the four branches as described above
4. Add `HYDRADB_API_KEY` as a Dify environment variable
5. Publish the workflow
6. Copy the API key to `DIFY_API_KEY` in `.env.local`
7. Copy the API URL to `DIFY_API_URL` (default: `https://api.dify.ai/v1`)
