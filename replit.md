# Eden Novel

AI-powered dark anime interactive novel engine — choose an AI provider, create a novel with genre/character settings, and experience a fully AI-narrated story with contextual choices, progression, and immersion features.

## Run & Operate

- `pnpm --filter @workspace/eden-novel run dev` — run the Eden Novel app (port 18436)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7 + Tailwind CSS v4 + Framer Motion
- Routing: Wouter
- DB (client-side): Dexie (IndexedDB) — no server-side DB needed
- AI: 6 providers (Grok, Gemini, OpenAI, Claude, DeepSeek, HuggingFace) via direct browser fetch
- TTS: Nova Sonic (proxied via `/nova`)

## Where things live

- `artifacts/eden-novel/src/screens/` — all page-level screens (StoryScreen, NovelSelectionScreen, etc.)
- `artifacts/eden-novel/src/services/` — AI orchestration, model service, progression, portrait, etc.
- `artifacts/eden-novel/src/presets/` — AI system prompt building blocks (base_narrator, genre presets, scene_awareness_engine, etc.)
- `artifacts/eden-novel/src/database/` — Dexie IndexedDB wrappers for novels, characters, scenes, etc.
- `artifacts/eden-novel/src/parsers/tagParser.ts` — parses narrative tags from AI output
- `artifacts/eden-novel/public/portraits/` — character portrait images (user-provided, organized by genre/role)
- `artifacts/eden-novel/.replit-artifact/artifact.toml` — artifact config (PORT=18436, BASE_PATH=/)

## Architecture decisions

- **No server-side DB**: All persistence is in IndexedDB via Dexie. The app runs entirely in the browser.
- **Direct AI API calls from browser**: AI providers are called directly from the frontend (CORS permitting). No backend proxy except for Nova TTS.
- **Tag-based AI output**: AI responses use custom tags (`/choice/`, `/new_char:/`, `/location_change:/`, etc.) parsed by tagParser.ts.
- **Provider-agnostic model service**: modelService.ts abstracts all 6 AI providers behind a single streaming interface.
- **Preset composition**: System prompts are composed from modular preset files in `src/presets/`.

## Product

- Choose from 20 genres (zombie, cultivation, school, isekai, cyberpunk, fantasy, mafia, horror, etc.)
- Create a Main Character with name, traits, starting skills, and optional reborn/regression backstory
- AI generates a cinematic story opening and continues the narrative based on player choices
- Characters are tracked with portraits, relationships, and progression stats
- Pilot (auto-play) mode for autonomous story progression
- Chapter system with history and timeline branching
- Ask Eden mode for out-of-story AI assistance

## User preferences

- Do not rewrite existing working code — make targeted additions only
- The app is a pure frontend (no server DB); use IndexedDB for all persistence
- Audio and image assets are user-provided and placed in `public/` folders; the app reads them, never generates them

## Gotchas

- The vite.config.ts requires both `PORT` and `BASE_PATH` env vars — these are set in `artifact.toml`
- Eden Novel uses `@workspace/api-client-react` as a devDep (for type infra) but does NOT call the backend API — all AI calls are direct browser fetches
- `GROK_API_KEY` was missing from modelService.ts (fixed: now uses `this.getApiKey('grok')`)
- Portrait images live in `public/portraits/{genre}/{role}/` — folders exist with README.txt; user drops in JPG/PNG files
- Audio files live in `public/audio/{ambient|music|sfx}/` — to be created in Task #3
- Environment images live in `public/environments/{genre}/` — to be created in Task #3

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- All AI system prompt rules are in `src/presets/` — do not hardcode prompt text in services
