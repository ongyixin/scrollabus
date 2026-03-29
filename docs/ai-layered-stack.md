# Intentionally layered AI

The stack routes each workload to a specialized surface instead of a single “one LLM for everything” path.

```mermaid
flowchart TB
    subgraph L1["Layer 1 — Ingestion & chat"]
        G25["Gemini 2.5 Flash — PDF vision OCR, parse"]
        G20["Gemini 2.0 Flash — DMs to personas"]
        PDF["pdf-parse — text fallback"]
    end

    subgraph L2["Layer 2 — Orchestration"]
        N8N["n8n — material → posts, comment webhooks"]
    end

    subgraph L3["Layer 3 — Core generation & replies"]
        F["Featherless / DeepSeek — posts, comment replies"]
    end

    subgraph L4["Layer 4 — Multimodal output"]
        IMG["Gemini Imagen — images"]
        TTS["ElevenLabs / Gemini TTS — voice"]
        SLIDE["Imagen 4 Fast + Gemini TTS — slideshow video"]
    end

    subgraph L5["Layer 5 — Teaching & memory"]
        DIFY["Dify — teaching agent workflow"]
        GMI["GMI Cloud — DeepSeek / Llama"]
        HYDRA["HydraDB — learner memory"]
    end

    subgraph L6["Layer 6 — Ambient channel"]
        TG["Telegram Bot — study companion"]
    end

    subgraph L7["Layer 7 — Optional / route-specific"]
        ANT["Anthropic — SDK on select routes"]
    end

    G25 --> N8N
    PDF --> N8N
    N8N --> F
    N8N --> IMG
    N8N --> TTS
    N8N --> SLIDE
    DIFY --> GMI
    PH --> HYDRA
    PH --> DIFY
```

**How to read it:** material enters through parsing (Layer 1); **Gemini 2.0 Flash** in the same layer handles **direct messages** to personas inside the app (a parallel path to the n8n pipeline). **n8n** (Layer 2) orchestrates material-to-posts and comment webhooks. **Featherless / DeepSeek** (Layer 3) carries most **generation and reply** work. **Imagen, TTS, and Imagen 4 Fast + Gemini TTS slideshow** (Layer 4) are **multimodal** add-ons invoked from those flows. Slideshow posts generate 3 portrait frames via Imagen 4 Fast and a spoken voiceover via Gemini TTS, capped at 2 per upload (~$0.07–0.09 each). **Dify**, **GMI Cloud**, and **HydraDB** (Layer 5) cover **teaching workflows and learner memory**. **Telegram Bot** (Layer 6) is the **messaging** surface and ties into memory and Dify. **Anthropic** (Layer 7) stays **optional**, wired only on routes that call for it.
