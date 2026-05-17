# CODE.md — Eden Novel: Complete File-by-File Architecture

This document describes **every file** in the Eden Novel project, what it does, how it works internally, and exactly which other files it connects to.

---

## Table of Contents

1. [Project Overview & Data Flow](#1-project-overview--data-flow)
2. [Root Workspace Files](#2-root-workspace-files)
3. [Eden Novel Frontend — Entry & Routing](#3-eden-novel-frontend--entry--routing)
4. [Context Providers](#4-context-providers)
5. [Database Layer (IndexedDB via Dexie.js)](#5-database-layer-indexeddb-via-dexiejs)
6. [Services Layer](#6-services-layer)
7. [Core Utilities & Configuration](#7-core-utilities--configuration)
8. [Parsers](#8-parsers)
9. [Preset System (AI Prompt Engineering)](#9-preset-system-ai-prompt-engineering)
10. [Screens (Full-Screen Routes)](#10-screens-full-screen-routes)
11. [Panels (Bottom-Sheet Overlays)](#11-panels-bottom-sheet-overlays)
12. [Overlays (Full-Screen Modal Layers)](#12-overlays-full-screen-modal-layers)
13. [Components](#13-components)
14. [Hooks](#14-hooks)
15. [API Server](#15-api-server)
16. [Shared Libraries (lib/)](#16-shared-libraries-lib)
17. [Connection Map: Who Imports What](#17-connection-map-who-imports-what)

---

## 1. Project Overview & Data Flow

Eden Novel is a **mobile-first, AI-powered interactive narrative engine** presented as a messenger-style chat UI. The player experiences a dark anime story through chat bubbles, makes choices, levels up their character, and can enable Pilot Mode (AI autopilot) to watch the story unfold automatically.

### High-Level Architecture

```
Browser (React SPA)
│
├── IndexedDB (Dexie.js) — LOCAL source of truth for ALL story data
│   ├── novels, chapters, scenes, characters
│   ├── progression_data, skill_registry
│   ├── memories, inventory, world_state, timelines
│
├── AI Provider (streaming SSE) — generates story text
│   ├── HuggingFace Router API (open-source models)
│   ├── Grok (xAI) — uses VITE_GROK_API_KEY env var
│   ├── Gemini (Google) — user provides API key
│   ├── OpenAI — user provides API key
│   ├── Claude (Anthropic) — user provides API key
│   ├── DeepSeek — user provides API key
│   └── Nova by Amazon (Nova 2 Sonic) — routes via nova-server.js backend; bearer token auth
│
├── Nova Server (nova-server.js) — local Node.js backend (port 3001)
│   ├── Express + Socket.IO — handles bidirectional WebSocket streaming
│   ├── Amazon Bedrock API (InvokeModelWithBidirectionalStream)
│   ├── POST /nova/tts — text-to-speech, returns base64 PCM audio
│   ├── POST /nova/generate — SSE story scene generation
│   └── GET /nova/health — key + connectivity check
│
└── API Server (Express) — cloud backup only
    └── MongoDB Atlas — backup/sync of IndexedDB data
```

### Complete Data Flow Per Player Action

```
Player clicks a choice or types an action
    ↓
StoryScreen.handleAction()
    ↓
orchestrationService.generateNextScene()
    ├── Loads world state from IndexedDB (worldStateService)
    ├── Loads memories from IndexedDB (memoryService)
    ├── Loads characters from IndexedDB (characterDB)
    ├── Builds system prompt from presetManager (stacks genre presets)
    ├── Sends prompt to AI via modelService (streaming SSE)
    │   └── Yields tokens → StoryContext.UPDATE_STREAMING (live preview bar)
    ├── parseNarrativeTags() extracts all /tag:value/ events from AI output
    ├── Applies tag side-effects:
    │   ├── /location_change/ → updateWorldStateFields()
    │   ├── /new_char/ → createCharacter() in IndexedDB
    │   ├── /level_up/ → progressionService.triggerLevelUp()
    │   ├── /skill_unlock/ → dispatch ADD_SKILL_UNLOCK
    │   ├── /chapter_end/ → chapterService.closeChapterAndBeginNext()
    │   ├── /inventory_add/ → inventoryDB.addItem()
    │   ├── /character_death/ → characterDB.updateCharacter(status='dead')
    │   └── /pilot_pause/ → dispatch PILOT_PAUSE
    ├── recordMemory() saves scene summary to IndexedDB
    └── incrementScene() updates world state scene counter
        ↓
StoryScreen.processParsedOutput()
    ├── parseBubbles() splits AI text into chat bubbles
    ├── dispatch ADD_BUBBLE for each bubble (narrator or NPC)
    └── dispatch SET_INTERACTION with choices array
        ↓
If actionCount >= 20 → closeChapterAndBeginNext() auto-chapter
If pilotMode → pilotService.makePilotDecision() → handleAction(chosen)
If levelUp → LevelUpOverlay shown
```

---

## 2. Root Workspace Files

### `/package.json`
Root workspace configuration. Defines global scripts:
- `pnpm run typecheck` — typechecks all packages in dependency order
- `pnpm run typecheck:libs` — only typechecks composite lib packages
- Global devDependencies: `typescript@5.9`, `prettier`
- Sets preinstall guard preventing npm/yarn usage

### `/pnpm-workspace.yaml`
Defines which directories are workspace packages:
- `artifacts/*` — deployable apps (eden-novel, api-server, mockup-sandbox)
- `lib/*` — shared TypeScript libraries
- `scripts` — utility scripts
- Defines catalog pins: shared dependency versions like `react`, `vite`, `framer-motion`, etc.

### `/tsconfig.json`
Root TypeScript solution file. Only references composite lib packages (`lib/api-zod`, `lib/api-client-react`, `lib/db`). Does NOT include artifact packages (they are leaves and checked separately).

### `/tsconfig.base.json`
Shared strict TypeScript defaults extended by all packages:
- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- Target: ES2022, module: ESNext
- All packages extend this via `"extends": "../../tsconfig.base.json"`

### `/replit.nix`
Nix environment configuration for Replit. Provides Node.js 24 runtime, pnpm, and system tools.

### `/.replit`
Replit platform configuration. Defines workflows (which commands run per artifact), port mappings, and preview paths.

### `/replit.md`
Human-readable project overview and user preferences. Read by the agent before all tasks. Contains architecture decisions, stack details, file locations, and gotchas.

### `/.npmrc`
Sets `shamefully-hoist=false` (pnpm strict mode) — each package must declare its own dependencies.

### `/nova-server.js` (NEW)
Root-level Express + Socket.IO server that handles Amazon Nova 2 Sonic's bidirectional streaming protocol. Runs alongside the Vite frontend on port 3001 (configurable via `NOVA_SERVER_PORT` secret).

**Auth:** Reads `BEDROCK_API_KEY` from Replit Secrets, sets it as `process.env.AWS_BEARER_TOKEN_BEDROCK`, then injects `Authorization: Bearer <key>` into every Bedrock request via an AWS SDK middleware override — no AWS IAM credentials required.

**Dependencies:** `@aws-sdk/client-bedrock-runtime`, `express`, `socket.io`, `cors`, `uuid`

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/nova/health` | Health check — confirms key is configured and server is running |
| `POST` | `/nova/tts` | Accepts `{ text, speaker, isNarrator }` → streams Nova Sonic, returns `{ audioChunks: string[] }` (base64 PCM 24 kHz) |
| `POST` | `/nova/generate` | SSE story text generation — streams tokens as `data: {...}` events |

**Socket.IO events (server → client):**
- `nova:token` — individual text token during generation
- `nova:audio` — base64 PCM audio chunk
- `nova:done` — generation complete with `fullText`
- `nova:error` — error during generation

**TTS flow:** `StoryScreen` detects new bubble → calls `novaSonicService.speakBubble()` → fetches `/nova/tts` → decodes PCM → plays via WebAudio API. Deduplication via `Set<bubbleId>` prevents re-reading.

**Model:** `amazon.nova-2-sonic-v1:0` | **Region:** `us-east-1`

---

## 3. Eden Novel Frontend — Entry & Routing

**Location:** `artifacts/eden-novel/src/`

### `main.tsx`
**Entry point.** Mounts the React application.
```
ReactDOM.createRoot(#root) → renders <App />
```
- Imports: `App.tsx`, `index.css`
- Connected to: `App.tsx` (only)
- Loaded by: Vite bundler via `index.html`

---

### `App.tsx`
**Root application component.** Wraps everything in context providers and sets up routing.

**Provider nesting order (outer → inner):**
```
AppProvider (settings/theme)
  └── ModelProvider (AI provider state)
       └── StoryProvider (current story/bubble state)
            └── ProgressionProvider (RPG stats/skills)
                 └── WouterRouter (path-based routing)
                      └── GuardedRoutes (conditional navigation)
```

**`GuardedRoutes`** enforces a setup flow:
1. No provider selected → `/provider-select`
2. Provider = Grok → skip to `/novels` (key embedded in env)
3. Provider = Gemini/OpenAI/Claude/DeepSeek → check API key → `/api-key-setup` if missing
4. Provider = HuggingFace → check HF token → `/token-setup`, then model → `/model-selection`
5. Everything ready → routes proceed normally

**Routes registered:**
| Path | Component |
|------|-----------|
| `/provider-select` | ProviderSelectionScreen |
| `/api-key-setup` | ApiKeySetupScreen |
| `/token-setup` | HFTokenScreen |
| `/model-selection` | ModelSelectionScreen |
| `/novels` | NovelSelectionScreen |
| `/genre-picker` | GenrePickerScreen |
| `/story/:novelId` | StoryScreen |
| `/settings` | SettingsScreen |
| `/chapters/:novelId` | ChapterHistoryScreen |
| `/timeline/:novelId` | TimelineBranchScreen |
| `/` | NovelSelectionScreen |

**Imports from:** `AppContext`, `ModelContext`, `StoryContext`, `ProgressionContext`, all 10 screen components, `wouter`

---

### `index.css`
Global stylesheet. Imports Tailwind CSS base, components, and utilities. Defines custom utilities:
- `.no-scrollbar` — hides scrollbars across browsers
- `.safe-top` / `.safe-bottom` — safe area insets for mobile notch/home-bar
- CSS variable overrides for Tailwind dark theme
- Font imports (if any)

---

## 4. Context Providers

All contexts are in `src/context/`. They use React `createContext` + `useReducer` or `useState` to manage shared state. Consumers access them via custom hooks (e.g., `useStory()`).

---

### `context/AppContext.tsx`
**Purpose:** Stores user-configurable app settings. Persists to `localStorage` automatically on every change.

**State shape:**
```typescript
{
  theme: 'dark' | 'amoled' | 'light'  // UI color scheme
  bubbleDelay: number                   // ms delay between chat bubble animations (default 300)
  maxTokens: number                     // AI generation token limit (default 600)
  temperature: number                   // AI creativity/randomness (default 0.7)
  autoChapterEvery: number              // actions before auto-chapter (default 10)
  textSize: 'small' | 'medium' | 'large'
  pilotSensitivity: 'sensitive' | 'normal' | 'relaxed'
}
```

**How it works:**
- `loadSettings()` reads from `localStorage['eden_settings']` on init
- `reducer()` handles all `SET_*` actions and writes to `localStorage` after every change
- No async operations — purely synchronous state machine

**Consumer:** `StoryScreen` (reads `settings.bubbleDelay`, `maxTokens`, `temperature`, `textSize`), `SettingsScreen` (writes via `dispatch`)

**Exports:** `AppProvider`, `useAppSettings()`

---

### `context/ModelContext.tsx`
**Purpose:** Bridges `modelService` (class singleton) to React component tree. Provides reactive state for AI provider/model/connection status.

**How it works:**
- `modelService` is a class with its own internal `listeners[]` array (observer pattern)
- `ModelProvider` subscribes to `modelService.addListener(update)` on mount
- When any model state changes (token saved, model selected, etc.), `modelService.notifyListeners()` triggers the `update` function, which reads fresh state from the service and calls `setState()`
- All write operations are thin wrappers: `saveToken(t) → modelService.saveToken(t)`

**State exposed:**
```typescript
{
  hfToken, selectedModel, isConnected, connectionError
  availableModels, provider, providerSelected, isProviderReady
}
```

**Imports from:** `services/modelService.ts`
**Consumed by:** `App.tsx` (GuardedRoutes), `HFTokenScreen`, `ModelSelectionScreen`, `ApiKeySetupScreen`, `ProviderSelectionScreen`, `SettingsScreen`

**Exports:** `ModelProvider`, `useModel()`

---

### `context/StoryContext.tsx`
**Purpose:** Central real-time story state during active gameplay. All UI that displays story content reads from here.

**State shape:**
```typescript
{
  novelId: number | null          // active novel's IndexedDB ID
  mcUid: string                   // protagonist's internal_uid
  genre: string                   // e.g. 'zombie', 'fantasy'
  timelineId: string              // active timeline branch
  bubbles: Bubble[]               // all chat messages shown in the scroll area
  interactionMode: 'cinematic' | 'decision' | 'roleplay' | 'passive'
  choices: string[]               // current choice options (decision mode)
  isGenerating: boolean           // true while AI is streaming
  pilotMode: boolean              // AI autopilot active
  pilotPaused: boolean            // autopilot paused for player input
  pilotPauseReason: string        // why autopilot paused
  pendingLevelUp: LevelUpResult | null  // triggers LevelUpOverlay
  pendingSkillUnlocks: string[]   // toast notifications for new skills
  currentChapter: number
  currentLocation: string
  currentArc: string
  streamingText: string           // accumulates tokens during generation (live preview)
  error: string | null
  actionCount: number             // player actions in current chapter
}
```

**Bubble interface:**
```typescript
{
  id: string          // unique ID (from generateId())
  speaker?: string    // NPC name, or undefined for narrator
  content: string
  isNarrator?: boolean
  isUser?: boolean    // player's own action bubble
  isStreaming?: boolean
  bubbleColor?: string // character's unique color from CharacterDB
  timestamp: number
}
```

**Key actions:**
- `ADD_BUBBLE` — appends one bubble to the chat
- `UPDATE_STREAMING` — updates the live preview bar text (not yet committed to bubbles)
- `FINISH_STREAMING` — clears streaming text after commit
- `SET_GENERATING` — blocks player input while AI works
- `INCREMENT_ACTION` — increments chapter action counter
- `SET_PILOT` / `PILOT_PAUSE` / `PILOT_RESUME` — autopilot control

**Imports from:** `services/progressionService.ts` (for `LevelUpResult` type)
**Consumed by:** `StoryScreen.tsx` (primary consumer — reads + dispatches everything)

**Exports:** `StoryProvider`, `useStory()`, `Bubble` (type)

---

### `context/ProgressionContext.tsx`
**Purpose:** Caches the current MC's RPG progression data and skills for display in StatusPanel and LevelUpOverlay. Not a real-time reactive store — must be explicitly reloaded.

**State shape:**
```typescript
{
  progression: ProgressionData | null  // level, rank, stats, unspent points
  skills: SkillRegistry[]              // all unlocked skills
  reload: (novelId, mcUid) => Promise<void>  // re-fetches from IndexedDB
}
```

**How it works:**
- On mount: no data (null)
- `StoryScreen` calls `reload(novelId, mcUid)` after loading a novel and after each level-up
- `reload()` calls `getProgression()` + `getSkills()` from `progressionDB.ts` and updates state

**Imports from:** `database/progressionDB.ts`
**Consumed by:** `StoryScreen.tsx` (calls `reload`), `StatusPanel.tsx`, `LevelUpOverlay.tsx`, `SkillTreeOverlay.tsx`

**Exports:** `ProgressionProvider`, `useProgression()`

---

## 5. Database Layer (IndexedDB via Dexie.js)

**Location:** `src/database/`

All data is stored locally in the browser's IndexedDB. The database is **version 4** and handles migrations automatically.

---

### `database/db.ts`
**Purpose:** Defines the complete IndexedDB schema and all TypeScript interfaces for every table.

**Database class:** `EdenNovelDB extends Dexie`

**Tables and their schemas:**

| Table | Primary Key | Indexes | Description |
|-------|------------|---------|-------------|
| `novels` | `++id` | title, genre, created_at, last_played_at | One record per story |
| `chapters` | `++id` | novel_id, timeline_id, chapter_number | Auto-generated chapter records |
| `scenes` | `++id` | chapter_id, novel_id, timeline_id | Raw AI output per player action |
| `characters` | `++id` | novel_id, internal_uid, status, role | All NPCs + protagonist |
| `character_relationships` | `++id` | novel_id, character_a/b_uid | Relationship graph |
| `world_state` | `++id` | `&novel_id` (unique) | One world state object per novel |
| `progression_data` | `++id` | novel_id, character_uid | Level/rank/stats per character |
| `skill_registry` | `++id` | novel_id, character_uid, skill_name, rarity | Unlocked skills |
| `skill_tree_nodes` | `++id` | novel_id, character_uid, node_name, path_name | Skill tree graph |
| `timelines` | `++id` | novel_id, parent_timeline_id | Branch points |
| `memories` | `++id` | novel_id, timeline_id, importance_score | AI-summarized memory entries |
| `inventory` | `++id` | novel_id, character_uid | Items + currency |
| `presets_registry` | `++id` | preset_name, category | Loaded preset tracker |

**Migration versions:**
- **v1:** Initial schema
- **v2:** Adds `mc_traits_json`, `starting_skills_json`, `action_count` to novels (migration fills blanks with defaults)
- **v3:** Adds `current_location` and `has_introduced_self` to characters
- **v4:** Adds `starting_location` to novels

**Singleton export:** `export const db = new EdenNovelDB()`

**Imported by:** Every `*DB.ts` helper file, `grokContextBuilder.ts`

---

### `database/novelDB.ts`
**Purpose:** CRUD operations for the `novels` and `world_state` tables.

**Functions:**
- `createNovel(input)` — inserts a novel record, creates a blank world state JSON for it, returns the new `id`
- `getAllNovels()` — returns all novels sorted by `last_played_at` descending
- `getNovel(id)` — fetches one novel by primary key
- `deleteNovel(id)` — removes novel + cascades deletes to related tables
- `updateNovelLastPlayed(id)` — touches `last_played_at = Date.now()`
- `incrementNovelActionCount(id)` — increments `action_count` field and returns new value
- `resetNovelActionCount(id)` — sets `action_count = 0`
- `getWorldState(novelId)` — returns the parsed world state JSON object for a novel
- `setWorldState(novelId, state)` — upserts the world_state row

**Imported by:** `novelService.ts`, `worldStateService.ts`, `mongoSync.ts`

---

### `database/characterDB.ts`
**Purpose:** CRUD for the `characters` and `character_relationships` tables.

**Functions:**
- `createCharacter(input)` — generates a unique `internal_uid` (UUID-style), assigns a `bubble_color` from the `BUBBLE_COLORS` constants, inserts the record, returns the created character
- `getCharactersByNovel(novelId)` — all characters for a novel
- `getCharacterByUid(uid, novelId)` — single character lookup
- `updateCharacter(id, changes)` — partial update (e.g., `status: 'dead'`)
- `markCharacterIntroduced(uid, novelId)` — sets `has_introduced_self = true`
- `updateRelationship(novelId, aUid, bUid, type, val)` — upserts a relationship record

**Imported by:** `orchestrationService.ts`, `grokContextBuilder.ts`, `novelService.ts`, `mongoSync.ts`, `CharacterPanel.tsx`

---

### `database/chapterDB.ts`
**Purpose:** CRUD for the `chapters` table.

**Functions:**
- `addChapter(data)` — inserts a chapter record, increments `total_chapters` on the parent novel, returns new chapter `id`
- `getChaptersByNovel(novelId)` — all chapters ordered by `chapter_number`
- `getLastChapter(novelId)` — the most recent chapter

**Imported by:** `chapterService.ts`, `askEdenService.ts`, `mongoSync.ts`, `ChapterHistoryScreen.tsx`, `NovelSelectionScreen.tsx`

---

### `database/sceneDB.ts`
**Purpose:** CRUD for the `scenes` table (raw AI output archives).

**Functions:**
- `addScene(data)` — inserts raw AI output as a scene record
- `getLastScenes(novelId, timelineId, count)` — returns the N most recent scenes for context injection (used by HF/small models that need recent scene history)

**Imported by:** `orchestrationService.ts`, `grokContextBuilder.ts`

---

### `database/progressionDB.ts`
**Purpose:** CRUD for `progression_data` and `skill_registry` tables.

**Functions:**
- `createProgression(data)` — inserts initial progression record
- `getProgression(novelId, characterUid)` — fetches progression for a character
- `updateProgression(id, changes)` — updates level, rank, stats, unspent_points
- `addSkill(data)` — inserts a newly unlocked skill into the registry
- `getSkills(novelId, characterUid)` — all skills for a character

**Imported by:** `progressionService.ts`, `ProgressionContext.tsx`, `mongoSync.ts`

---

### `database/memoryDB.ts`
**Purpose:** CRUD for the `memories` table. Memories are short summaries of key story events.

**Functions:**
- `addMemory(data)` — inserts a new memory record
- `getTopMemories(novelId, timelineId, limit)` — returns highest-importance memories, sorted by `importance_score` descending
- `archiveOldMemories(novelId, timelineId, keepCount)` — marks oldest memories as `archived_at = Date.now()` to prevent unbounded growth (keeps only the top N)

**Imported by:** `memoryService.ts`, `grokContextBuilder.ts`

---

### `database/inventoryDB.ts`
**Purpose:** CRUD for the `inventory` table. Stores items and currency per character.

**Functions:**
- `initInventory(novelId, characterUid)` — creates a blank inventory record
- `getInventory(novelId, characterUid)` — fetches inventory
- `addItem(novelId, characterUid, itemName, qty)` — adds or increments an item in the `items_json` array
- `removeItem(novelId, characterUid, itemName, qty)` — decrements or removes an item

**Imported by:** `orchestrationService.ts`, `novelService.ts`, `InventoryPanel.tsx`

---

## 6. Services Layer

**Location:** `src/services/`

Services contain all business logic. They are plain TypeScript modules (not React), imported by screens, orchestration, and each other.

---

### `services/modelService.ts`
**Purpose:** Central AI provider abstraction. Single class `ModelService` that handles authentication, model selection, connection testing, and streaming generation across all 7 AI providers.

**Singleton:** `export const modelService = new ModelService()`

**State (on instance):**
- `hfToken` — HuggingFace access token (persisted to `localStorage['hf_token']`)
- `selectedModel` — model ID string (persisted to `localStorage['selected_model']`)
- `isConnected` — boolean connection status
- `connectionError` — last error string
- `availableModels` — array of models fetched from HF API
- `listeners[]` — observer callbacks for React context bridge

**AI Providers:**

| Provider | Base URL | Default Model | Auth |
|----------|----------|--------------|------|
| HuggingFace | `https://router.huggingface.co/v1` | User-selected | `hf_token` in localStorage |
| Grok (xAI) | `https://api.x.ai/v1` | `grok-3-fast` | `VITE_GROK_API_KEY` env var |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash` | `gemini_api_key` in localStorage |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` | `openai_api_key` in localStorage |
| Claude | `https://api.anthropic.com/v1` | `claude-3-5-haiku-20241022` | `claude_api_key` in localStorage |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` | `deepseek_api_key` in localStorage |
| Nova | `/nova/generate` (local backend) | `amazon.nova-2-sonic-v1:0` | `bedrock_api_key` in localStorage → `BEDROCK_API_KEY` secret (Bearer token) |

**Core method: `generateStream(systemPrompt, userPrompt, options): AsyncGenerator<string>`**
- Detects current provider and routes to the appropriate private stream method
- All providers (except Claude) use the OpenAI-compatible `/chat/completions` endpoint with `stream: true`
- Claude uses its own `/messages` API with `stream: true` and a different SSE event format (`content_block_delta`)
- `_readSSEStream()` is a shared SSE parser: reads chunks from `ReadableStream`, splits by `\n`, parses `data: {...}` JSON, yields `choices[0].delta.content`

**Fallback logic:** If Gemini returns 404 (model not found), retries with `gemini-1.5-flash`. Same for OpenAI → `gpt-4o`.

**`generateText()` method:** Non-streaming version for background tasks (chapter title generation, skill generation, pilot decisions). Uses the same provider routing but returns the full response text.

**Observer pattern:**
- `addListener(fn)` / `removeListener(fn)` — `ModelContext` subscribes/unsubscribes
- `notifyListeners()` — called after every state change so React re-renders

**Imported by:** `ModelContext.tsx`, `orchestrationService.ts`, `progressionService.ts`, `chapterService.ts`, `pilotService.ts`, `askEdenService.ts`, `presetManager.ts`

---

### `services/presetManager.ts`
**Purpose:** Loads all preset files (`.ts` files in `src/presets/`) and stacks them into system prompts for different AI tasks.

**Singleton:** `export const presetManager = new PresetManager()`

**How loading works:**
1. `loadAll()` uses Vite's `import.meta.glob('../presets/**/*.ts', { eager: true })` to import all preset modules at build time
2. Each preset file exports a `default` string
3. The string is stored in `this.presets[filename_without_extension]`
4. This must be called before any `stackPresets()` calls (called in `StoryScreen` + `GenrePickerScreen` before novel creation)

**Key methods:**

`getGenreSystemPrompt(genre)` — builds the main story system prompt by stacking:
```
base_narrator
+ {genre}_genre          (e.g. zombie_genre, fantasy_genre)
+ messenger_bubble_ui
+ character_metadata_expansion
+ world_state_persistence
+ leveling_system
+ mc_traits_system
+ story_seed_integration
+ story_opening_rules
+ starting_location
+ chapter_system
+ character_introduction_protocol
+ grok_content_policy     (only if provider === 'grok')
```

`getPilotDecisionPrompt()` — returns `pilot_autopilot_decision` preset
`getAskEdenPrompt()` — stacks `ask_eden_core` + `ask_eden_system_explainer`
`getChapterGenerationPrompt()` — stacks `chapter_generation` + `chapter_summary`
`getSkillGenerationPrompt(genre)` — stacks `ai_skill_generation` + `{genre}_progression` + `leveling_system`

**Imported by:** `orchestrationService.ts`, `progressionService.ts`, `chapterService.ts`, `pilotService.ts`, `askEdenService.ts`, `StoryScreen.tsx`, `GenrePickerScreen.tsx`

---

### `services/orchestrationService.ts`
**Purpose:** The brain of the story engine. Coordinates AI generation, tag parsing, and all resulting game state changes. This is the most complex file in the codebase.

**Exports two main functions:**

#### `generateNovelOpening(novelId, genre, mcName, worldName, storySeed, callbacks, mcTraitsJson?, startingLocation?)`
Called once when a new novel's first scene is needed (no prior bubbles).

Steps:
1. Calls `analyzeHook(storySeed, mcName)` to detect if the seed is a regression/rebirth story
2. Builds a detailed opening prompt with:
   - Hook timeline analysis block (tells AI exactly when in time the story starts)
   - MC traits block (personality, attitude, etc.)
   - Starting location constraint
   - 8-12 line scene structure rules
   - Mandatory choice format
3. Streams AI output token by token via `modelService.generateStream()`
4. If no `/choice/` tags appear in output, injects fallback choices automatically
5. Returns full text

#### `generateNextScene(novelId, timelineId, mcUid, mcName, genre, userAction, callbacks, maxTokens, temperature)`
Called for every subsequent player action.

Steps:
1. Loads novel, analyzes story seed for timeline constraints
2. For large-context providers (Grok/Gemini/OpenAI/Claude/Nova): calls `buildFullGrokContext()` — full IndexedDB dump
3. For small-context providers (HuggingFace): uses `buildMemoryContext()` + last 3 scenes
4. Builds character intro nudge (if any NPC hasn't introduced themselves yet)
5. Constructs user prompt with timeline constraints, context, and player action
6. Streams AI output
7. If no choices: injects fallback choices
8. Calls `parseNarrativeTags(fullText)` and fires all callbacks:
   - `onToken` → StoryContext streaming preview
   - `onTagsParsed` → (unused by caller, tags are processed inline)
   - `onLevelUp` → opens LevelUpOverlay
   - `onChapterEnd` → increments chapter counter
   - `onPilotPause` → pauses autopilot
   - `onNewCharacter` → informational
   - `onSkillUnlock` → shows toast
   - `onError` → shows error banner
9. Applies all parsed side-effects to IndexedDB:
   - Location changes → `updateWorldStateFields()`
   - World events → `addWorldEvent()`
   - Introduced speakers → `markCharacterIntroduced()`
   - New characters → `createCharacter()`
   - Inventory changes → `addItem()` / `removeItem()`
   - Character deaths → `updateCharacter({status:'dead'})`
   - Relationship updates → `updateRelationship()`
   - Level ups → `triggerLevelUp()`
   - Chapter ends → `closeChapterAndBeginNext()`
   - Pilot pause → callback
10. Saves memory: `recordMemory()` with first 300 chars of clean text

**`analyzeHook(hook, mcName)` (internal):**
- Detects regression/rebirth keywords (`reborn`, `regression`, `time travel`, etc.)
- Detects future-event references (`before the`, `two months before`, etc.)
- Generates a detailed `openingBlock` string that instructs the AI precisely where in time to begin
- Returns `{ isRegression, hasFutureEvent, timeBefore, futureEvent, openingBlock }`

**`buildTimelineConstraint(hook, mcName)` (internal):**
- For regression/future stories: generates a compact constraint block appended to EVERY scene prompt
- Prevents AI from jumping forward past the established timeline

**`isMCSpeaker(speaker, mcName)` (exported):**
- Used in `StoryScreen.processParsedOutput()` to skip rendering MC dialogue bubbles
- Handles partial name matching (e.g. "Kai" matches "Kai Tanaka")

**Imported by:** `StoryScreen.tsx`
**Imports from:** `modelService`, `presetManager`, `worldStateService`, `memoryService`, `grokContextBuilder`, `tagParser`, `characterDB`, `inventoryDB`, `sceneDB`, `chapterService`, `progressionService`, `novelService`

---

### `services/modelService.ts`
*(Documented in full above — see §6 ModelService)*

---

### `services/novaSonicService.ts` — Nova Sonic Frontend Client (NEW)
**Purpose:** Frontend TypeScript singleton that bridges the React app to the `nova-server.js` backend. Handles TTS audio fetching, PCM decoding, audio queue playback, and deduplication so every chat bubble is read aloud exactly once.

**Singleton:** `export const novaSonicService = new NovaSonicService()`

**Key state:**
- `socket` — Socket.IO client connection (path `/nova/socket.io`)
- `audioContext` — WebAudio `AudioContext` at 24 kHz (created lazily on first TTS call)
- `audioQueue` — `AudioBuffer[]` queue waiting to be played
- `currentSource` — currently playing `AudioBufferSourceNode`
- `isSpeaking` — true while audio is actively playing
- `isPaused` — true when user has pressed Stop
- `alreadySpoken` — `Set<string>` of bubble IDs that have already been sent to TTS (deduplication)

**Key methods:**

`connect()` / `disconnect()` — manages Socket.IO lifecycle; called when Nova provider is selected/deselected.

`speakBubble(bubbleId, text, speaker, isNarrator)`:
1. Checks `alreadySpoken` set — skips if already spoken
2. Adds `bubbleId` to `alreadySpoken`
3. If `isPaused`, returns immediately
4. POSTs to `/nova/tts` with `{ text, speaker, isNarrator }`
5. Receives `{ audioChunks: string[] }` (base64 PCM chunks)
6. Decodes each chunk via `pcmToAudioBuffer()` and pushes to `audioQueue`
7. Calls `playQueue()` if not already speaking

`pcmToAudioBuffer(pcmBytes)` — converts raw Int16 PCM bytes to a WebAudio `AudioBuffer` (divides each sample by 32768 to normalise to float32).

`playQueue()` — recursive: shifts next buffer from queue, creates `AudioBufferSourceNode`, plays it, and on `onended` calls itself again until queue is empty or paused.

`stop()` — sets `isPaused = true`, stops `currentSource`, clears `audioQueue`.

`resume()` — sets `isPaused = false`, restarts `playQueue()` if queue is non-empty.

`clearDedupe()` — clears `alreadySpoken` set; called when a new novel is loaded.

**Audio format:** Nova Sonic outputs raw PCM Int16 mono at 24 kHz. This service does NOT attempt to play it as MP3/WAV.

**Imported by:** `StoryScreen.tsx`

---

### `services/presetManager.ts`
*(Documented in full above — see §6 PresetManager)*

---

### `services/progressionService.ts`
**Purpose:** Manages the RPG leveling system. Handles initial stat allocation from starting skills, level-up calculations, and stat spending.

**Functions:**

`getRankForLevel(level, genre)` — maps level number to a rank string using `RANK_NAMES[genre]`. Every 3 levels = new rank tier (e.g. Level 1-3 → Bronze I, 4-6 → Bronze II, etc.).

`initPlayerProgression(novelId, characterUid, genre, startingSkills)`:
- Called once when a novel is created
- Stats start at 0 for all genre stat keys
- For each `StartingSkillAllocation` with `value > 0`:
  - Finds matching genre stat key (case-insensitive partial match)
  - Applies `value * 2` points (each allocated point = +2 stat value, cap at 30)
  - If no match found, creates a custom stat entry
- Inserts progression record with level=1

`triggerLevelUp(novelId, characterUid, genre)` → returns `LevelUpResult`:
1. Increments level by 1
2. Calculates new rank
3. For each genre stat: adds `floor(random * basePower) + 1` points (basePower scales with level)
4. Adds 3 unspent points to the pool
5. Calls `modelService.generateText()` with `getSkillGenerationPrompt(genre)` to generate an AI skill
6. Parses AI response: `NAME:`, `DESC:`, `RARITY:`, `EVOLVE:` fields
7. Falls back to `SKILL_FALLBACKS[genre]` array if AI generation fails
8. Saves skill to `skill_registry` table
9. Returns `{ oldLevel, newLevel, oldRank, newRank, statsGained, newSkill, unspentPoints }`

`spendStatPoints(novelId, characterUid, allocations)`:
- Called from `LevelUpOverlay` when player manually allocates stats
- Applies allocation to stats JSON, enforces 30 cap, deducts from `unspent_points`

**Imports from:** `progressionDB`, `genreStats`, `constants`, `modelService`, `presetManager`
**Imported by:** `orchestrationService.ts`, `novelService.ts`

---

### `services/chapterService.ts`
**Purpose:** Handles automatic chapter generation — titles, summaries, and chapter record creation.

**Functions:**

`generateChapterTitle(novelId, timelineId)` → string:
- Loads world state for context
- Sends a prompt to AI: "Generate a short chapter title (max 6 words)"
- Strips quotes from result, falls back to `"Chapter N"` on error

`generateChapterSummary(novelId, timelineId)` → string:
- Loads world state + last memories for context
- Sends a prompt: "Generate a 2-3 sentence chapter summary"
- Falls back to `"The story continues..."` on error

`closeChapterAndBeginNext(novelId, timelineId)` → chapterId:
1. Generates title (AI call)
2. Generates summary (AI call)
3. Loads current characters and world state
4. Inserts a chapter record with character + world snapshots
5. Returns new chapter ID

Called by: `StoryScreen` (on `action_count >= 20`) + `orchestrationService` (on `/chapter_end/` tag)

**Imports from:** `chapterDB`, `characterDB`, `worldStateService`, `modelService`, `presetManager`, `memoryService`
**Imported by:** `orchestrationService.ts`, `StoryScreen.tsx`

---

### `services/worldStateService.ts`
**Purpose:** Typed wrapper around the `world_state` IndexedDB table. Provides a structured `WorldStateData` interface and utility functions.

**`WorldStateData` interface** — the single world state object per novel:
```typescript
{
  genre, active_novel_id, active_timeline_id
  current_chapter, current_scene, scene_count_since_chapter
  current_location, current_arc, time_of_day, day_number, weather
  allowed_fields[], forbidden_fields[], enabled_systems[]
  established_locations[], active_factions[], world_events[]
  emotional_state, narrative_pacing
  pilot_mode_active
  progression_state: { current_level, current_rank, unspent_points, active_path, stats }
  active_character_uids[]
}
```

**Functions:**
- `loadWorldState(novelId)` — fetches and parses from IndexedDB
- `saveWorldState(novelId, state)` — serializes and upserts
- `updateWorldStateFields(novelId, updates)` — partial update (loads → merges → saves)
- `incrementScene(novelId)` — increments `current_scene` and `scene_count_since_chapter`
- `addWorldEvent(novelId, event)` — pushes to `world_events[]`, caps at 20 most recent
- `buildContextSummary(ws)` — returns a human-readable string for injection into AI prompts

**Imports from:** `novelDB`
**Imported by:** `orchestrationService`, `chapterService`, `askEdenService`, `StoryScreen`, `WorldPanel`

---

### `services/memoryService.ts`
**Purpose:** Manages the `memories` table. Memories are brief summaries of key story events that get injected into AI prompts to maintain narrative continuity.

**Functions:**

`recordMemory(novelId, timelineId, content, importanceScore, tags)`:
- Inserts a new memory record
- Calls `archiveOldMemories()` to keep total under 30

`buildMemoryContext(novelId, timelineId)` → string:
- Fetches top 10 memories by `importance_score`
- Returns formatted list: `"[Memory] content"`
- Used by `orchestrationService` (HF mode) and `askEdenService`

**Imports from:** `memoryDB`
**Imported by:** `orchestrationService.ts`, `chapterService.ts`, `askEdenService.ts`

---

### `services/pilotService.ts`
**Purpose:** AI Autopilot (Pilot Mode). When pilot mode is enabled, the AI reads the current choices and picks one autonomously.

**`PILOT_PAUSE_REASONS`** — map of pause codes to user-facing messages:
```
major_death → "A character has died. Resume Pilot Mode?"
moral_dilemma → "Major moral decision ahead. Take control?"
relationship_turn → "Relationship turning point. Resume Pilot?"
branch_event → "Story branch detected. Take control?"
```

**`makePilotDecision(choices, storyContext)`** → choice index (0-based):
1. Gets the `pilot_autopilot_decision` preset via `presetManager`
2. Sends prompt: "Given genre, arc, emotional state, recent events, and choices list — output ONLY a single digit"
3. Uses `maxTokens: 5, temperature: 0.4` (very short, low-creativity response)
4. Parses the digit with regex, returns as 0-based index into choices array
5. Falls back to index 0 on any error

**Imported by:** `StoryScreen.tsx`
**Imports from:** `modelService`, `presetManager`

---

### `services/askEdenService.ts`
**Purpose:** The "Ask Eden" feature — a story guide AI that answers questions about past events without changing story state.

**`askEden(novelId, timelineId, question)`** → string:
1. Loads world state, all characters, last 5 chapters, top 10 memories
2. Builds a context-rich prompt
3. Calls `modelService.generateText()` (non-streaming, 400 tokens)
4. Returns Eden's answer as plain text

The AI is instructed: "Answer as Eden, the story guide. Only reference events that have already happened."

**Imports from:** `modelService`, `presetManager`, `worldStateService`, `characterDB`, `chapterDB`, `memoryService`
**Imported by:** `AskEdenPanel.tsx`

---

### `services/novelService.ts`
**Purpose:** High-level novel management operations. The only service that touches multiple DB tables in one operation.

**`startNewNovel(input)`** → `{ novelId, mcUid }`:
1. Creates novel record in `novels` table
2. Creates protagonist character in `characters` table (role='protagonist', `has_introduced_self=true`)
3. Calls `initInventory()` for the MC
4. Calls `initPlayerProgression()` with starting skills
5. Returns both IDs for navigation

**Other functions:**
- `listNovels()` → all novels (sorted by last played)
- `loadNovel(id)` → single novel (also updates `last_played_at`)
- `removeNovel(id)` → deletion cascade
- `incrementActionCount(id)` → returns new count
- `resetActionCount(id)` → resets to 0

**Imports from:** `novelDB`, `characterDB`, `inventoryDB`, `progressionService`
**Imported by:** `StoryScreen.tsx`, `NovelSelectionScreen.tsx`, `GenrePickerScreen.tsx`

---

### `services/mongoSync.ts`
**Purpose:** Cloud backup — syncs local IndexedDB data to MongoDB via the API server. Runs silently; IndexedDB remains the source of truth.

**`syncNovelToMongo(novelId, mcUid)`** → boolean:
1. Reads all data in parallel: novel, characters, chapters, world state, progression, skills
2. POSTs to `/api/mongo/sync/${novelId}` with a complete snapshot
3. Returns `true` on success, `false` on any error (never throws)

**`checkMongoConnection()`** → boolean:
- GETs `/api/mongo/status`
- Returns `true` if `{ status: "connected" }`

**`API_BASE`** = `${import.meta.env.BASE_URL}api` — uses Vite's base URL to properly route through the reverse proxy.

Called by: `chapterService.ts` (after chapter close), `SettingsScreen.tsx` (connection test)

**Imports from:** `novelDB`, `characterDB`, `chapterDB`, `progressionDB`

---

### `services/grokContextBuilder.ts`
**Purpose:** Builds the complete "full context" prompt payload for large-context AI providers (Grok, Gemini, OpenAI, Claude). Instead of just recent memories, sends the ENTIRE story state.

**`buildFullGrokContext(novelId, timelineId)`** → string:
Queries all IndexedDB tables in parallel (10 parallel reads):
- `chapters`, `characters`, `world_state`, `character_relationships`, `memories`, `progression_data`, `skill_registry`, `inventory`, last 20 `scenes`

Formats into labeled sections:
```
=== WORLD STATE ===
=== ALL CHARACTERS (N) ===
=== RELATIONSHIPS ===
=== PROGRESSION ===
=== SKILLS (N) ===
=== INVENTORY ===
=== ALL MEMORIES (N) ===
=== ALL CHAPTERS (N) ===
=== RECENT SCENES (last N) ===
```

Returns the full string for injection into the AI user prompt.

**Imports from:** `db.ts` (direct Dexie access)
**Imported by:** `orchestrationService.ts`

---

### `services/portraitService.ts`
**Purpose:** Generates avatar initials and color for character portrait display.

**Functions:**
- `getPortraitColor(gender, characterUid)` — picks a color from `PORTRAIT_COLORS[gender]` array based on a hash of the UID (consistent per character)
- `getInitials(name)` — extracts first letters of first and last name words

**Imported by:** `CharacterAvatar.tsx`, `CharacterPanel.tsx`

---

### `services/validationService.ts`
**Purpose:** Guards against cross-genre contamination and invalid game state. Prevents AI hallucinations from corrupting game data.

**Functions:**
- `validateCharacterData(data, genre)` — blocks genre-inappropriate fields (e.g. `cultivation_rank` in a zombie novel)
- `validateStatAllocation(stats, genre, spentPoints, maxPoints)` — validates stat keys against `GENRE_STATS[genre]`, checks no negatives, checks point cap
- `sanitizeAIOutput(text)` — strips HTML tags, limits to 4000 chars
- `detectHallucination(text, genre)` — scans AI output for cross-genre keywords (e.g. "zombie horde" in a cultivation story)

**Imports from:** `genreStats.ts`
**Imported by:** (utility service — called defensively where needed)

---

## 7. Core Utilities & Configuration

**Location:** `src/core/`

---

### `core/constants.ts`
**Purpose:** Central store for all static game configuration arrays.

**Exports:**
- `RECOMMENDED_MODELS[]` — 8 curated HuggingFace/Together.ai models with labels, descriptions, speed/quality ratings
- `GENRES[]` — 20 genre definitions: `{ id, name, icon, description, color }`. Color is used as the card gradient tint in `NovelSelectionScreen`.
- `RANK_NAMES{}` — per-genre rank progression arrays (15 tiers each). Special arrays for cultivation, zombie, fantasy, superpower; all others use `default`.
- `BUBBLE_COLORS[]` — 15 dark hex colors assigned to characters at creation time
- `PORTRAIT_COLORS{}` — per-gender portrait background colors

**Imported by:** `App.tsx`, `NovelSelectionScreen.tsx`, `GenrePickerScreen.tsx`, `progressionService.ts`, `portraitService.ts`, `ModelSelectionScreen.tsx`

---

### `core/genreStats.ts`
**Purpose:** Defines the 7 stat keys for each of the 20 genres and fallback skill names for each genre.

**Exports:**
- `GENRE_STATS: Record<string, string[]>` — 7 stat names per genre (e.g. zombie: `['Core Level','Mutation Stability',...]`)
- `SKILL_FALLBACKS: Record<string, string[]>` — 7 skill name strings per genre, used when AI skill generation fails

**Imported by:** `progressionService.ts`, `validationService.ts`

---

### `core/genreStartingSkills.ts`
**Purpose:** Defines the 8 starting skills available for allocation at novel creation for each genre, plus the MC Traits system options.

**Exports:**
- `GENRE_STARTING_SKILLS: Record<string, StartingSkillDef[]>` — 8 skills per genre with name, description, icon, max (all 30)
- `MC_TRAITS` — 4 trait categories (personality, attitude, riskTolerance, altruism) with 6-10 option strings each
- `INITIAL_SKILL_POINTS = 5` — points available to distribute
- `MAX_SKILL_VALUE = 30` — per-skill cap
- TypeScript interfaces: `MCTraits`, `StartingSkillAllocation`, `StartingSkillDef`

**Imported by:** `GenrePickerScreen.tsx`, `progressionService.ts`

---

### `core/genreStartingLocations.ts`
**Purpose:** Pre-written starting location options for each genre's setup step.

**Exports:**
- `GENRE_STARTING_LOCATIONS: Record<string, string[]>` — 8-12 location strings per genre (e.g. zombie: `["Abandoned hospital", "Subway station", ...]`)

**Imported by:** `GenrePickerScreen.tsx`

---

### `core/utils.ts`
**Purpose:** Generic utility functions used across the app.

**Exports:**
- `generateId()` — returns a random UUID-style string (used for Bubble IDs)
- `formatDate(timestamp)` — formats a Unix ms timestamp to human-readable relative string (e.g. "2 days ago")

**Imported by:** `StoryScreen.tsx`, `NovelSelectionScreen.tsx`

---

### `lib/utils.ts`
**Purpose:** Tailwind CSS class merging utility (`cn()`). Combines `clsx` and `tailwind-merge` to safely merge class strings without conflicts.

**Imported by:** Almost all UI components

---

## 8. Parsers

### `parsers/tagParser.ts`
**Purpose:** Parses inline `/tag:value/` markers from AI narrative output. This is the core event-extraction mechanism — everything the AI signals back to the game engine flows through here.

**`parseNarrativeTags(text)`** → `TagParseResult`:

Processes the raw AI text in two passes:

**Pass 1:** Line-by-line scan for choice lines:
- Lines starting with `/choice/` → extract text → push to `result.choices[]`
- Non-choice lines → collected into `processedLines[]`
- If any choices found → `result.interactionMode = 'decision'`

**Pass 2:** Regex scan for inline tags `/ TAG_RE = /\/([a-zA-Z_]+)(?::([^/\n]*))?\//g /`:

| Tag | Effect |
|-----|--------|
| `/interaction_mode:roleplay/` | Sets interaction mode |
| `/location:Name/` or `/location_change:Name/` | Sets `result.locationChange` |
| `/level_up:true/` | Sets `result.levelUp = true` |
| `/chapter_end:true/` | Sets `result.chapterEnd = true` |
| `/new_char:Name\|gender\|role/` | Pushes to `result.newCharacters[]` |
| `/character_update:uid:field:val/` | Pushes to `result.characterUpdates[]` |
| `/skill_unlock:SkillName/` | Pushes to `result.skillUnlocks[]` |
| `/inventory_add:item:qty/` | Pushes to `result.inventoryAdds[]` |
| `/inventory_remove:item:qty/` | Pushes to `result.inventoryRemoves[]` |
| `/character_death:uid/` | Pushes to `result.characterDeaths[]` |
| `/relationship_update:uid:type:val/` | Pushes to `result.relationshipUpdates[]` |
| `/world_event:description/` | Pushes to `result.worldEvents[]` |
| `/pilot_pause:reason/` | Sets `result.pilotPause` |
| `/time_skip:description/` | Sets `result.timeSkip` |
| `/arc_complete/` | Sets `result.chapterEnd = true` |
| `/scene_start/`, `/scene_end/` | Stripped (structural only) |
| `/bold/`, `/endbold/`, `/italic/`, `/enditalic/` | Converted to markdown `**` / `_` |
| All other tags | Stripped from clean text |

**`parseBubbles(text)`** → array of `{ speaker?, content, isNarrator? }`:
- Splits text by newline
- For each line:
  - Matches `[Name]: "dialogue"` → `{ speaker: Name, content: dialogue }`
  - Matches `[Name] some text` → `{ speaker: Name, content: text }`
  - Otherwise → `{ content: line, isNarrator: true }`

**Imported by:** `orchestrationService.ts`, `StoryScreen.tsx`

---

## 9. Preset System (AI Prompt Engineering)

**Location:** `src/presets/`

Every `.ts` file in this directory exports a single `default` string. These strings are system-prompt instructions for the AI. They are loaded by `presetManager.ts` at runtime using `import.meta.glob()` and stacked in different combinations for different AI tasks.

**Rules:**
- Each file MUST have `export default "..."` as a string
- File name = preset key (used in `presetManager.stackPresets([...])`)
- Presets are combined with `\n---\n` separators

### Core Narrative Presets

**`base_narrator.ts`** — Establishes the AI's core narrator persona: dark anime style, immersive third-person perspective, formatting rules for dialogue and narration, forbidden behaviors (no meta-commentary, no addressing the player directly).

**`messenger_bubble_ui.ts`** — Tells the AI to format output for the messenger-style chat UI: `[Name]: "dialogue"` format for NPCs, narrator lines as plain paragraphs, `/choice/` format for player options.

**`story_opening_rules.ts`** — Rules specifically for the first scene of a novel: sensory grounding requirements, NPC introduction protocol, forbidden behaviors (jumping into action, skipping setup).

**`story_seed_integration.ts`** — How the AI should interpret the player's story hook/seed when generating scenes. Instructs the AI to honor the hook's premise without over-explaining or summarizing it.

**`chapter_system.ts`** — Rules about chapter structure: when chapter breaks happen, how to signal them with `/chapter_end:true/`, pacing guidelines.

**`world_state_persistence.ts`** — Instructs the AI to maintain consistency with the established world state: locations, NPCs, faction states, previously established facts.

**`character_introduction_protocol.ts`** — Rules for introducing new characters: physical description first, name revealed naturally in dialogue, `/new_char:Name|gender|role/` tag placement.

**`character_metadata_expansion.ts`** — How to enrich character descriptions with metadata tags for occupation, faction, personality markers.

**`leveling_system.ts`** — Explains the RPG progression system to the AI: when to use `/level_up:true/`, `/skill_unlock:name/`, how to narratively describe power growth.

**`mc_traits_system.ts`** — How the AI should use MC trait data (personality, attitude, risk tolerance, altruism) to shape the narrator's portrayal of the protagonist's inner experience.

**`starting_location.ts`** — Instructs the AI to honor the player's chosen starting location for the opening scene.

**`chapter_generation.ts`** + **`chapter_summary.ts`** — System prompts for the background AI tasks that generate chapter titles and summaries.

**`ai_skill_generation.ts`** — System prompt for generating skill cards at level-up. Defines the NAME/DESC/EFFECT/RARITY/EVOLVE response format.

**`ask_eden_core.ts`** + **`ask_eden_system_explainer.ts`** — Eden's persona and knowledge scope. Eden is a story guide who only speaks about past events.

**`pilot_autopilot_decision.ts`** — Instructions for Pilot Mode: given a story state and choice list, output only a single digit.

**`grok_content_policy.ts`** — Grok-specific content guidelines appended only when the provider is `grok`.

### Genre System Presets (20 files)

Each `{genre}_genre.ts` file defines genre-specific narrative rules:
- Tone and atmosphere
- What kinds of events are possible
- World-building rules
- Forbidden cross-genre elements

**Files:** `zombie_genre.ts`, `cultivation_genre.ts`, `school_genre.ts`, `cyberpunk_genre.ts`, `fantasy_genre.ts`, `mafia_genre.ts`, `romance_genre.ts`, `horror_genre.ts`, `detective_genre.ts`, `space_scifi_genre.ts`, `military_war_genre.ts`, `apocalypse_genre.ts`, `historical_genre.ts`, `survival_genre.ts`, `superpower_genre.ts`, `isekai_genre.ts`, `vampire_genre.ts`, `slice_of_life_genre.ts`, `thriller_genre.ts`, `crime_noir_genre.ts`

### Genre Progression Presets (12 files)

Each `{genre}_progression.ts` defines genre-specific skill naming, power scaling, and ability themes for that genre's level-up skill generation:

**Files:** `zombie_progression.ts`, `cultivation_progression.ts`, `school_progression.ts`, `cyberpunk_progression.ts`, `fantasy_progression.ts`, `mafia_progression.ts`, `romance_progression.ts`, `horror_progression.ts`, `school_progression.ts`, `isekai_progression.ts`, `superpower_progression.ts`, `thriller_progression.ts`, `vampire_progression.ts`

### `presets/types.ts`
Shared TypeScript types used across preset files (if any).

---

## 10. Screens (Full-Screen Routes)

**Location:** `src/screens/`

---

### `screens/ProviderSelectionScreen.tsx`
**Route:** `/provider-select`
**Purpose:** First-time setup — player picks their AI provider.

Shows a grid of provider cards: HuggingFace, Grok, Gemini, OpenAI, Claude, DeepSeek. Each card shows the provider's name, logo/icon, and description. On select: calls `modelContext.setProvider(p)` and navigates.

**Connects to:** `ModelContext`, `modelService.setProvider()`

---

### `screens/HFTokenScreen.tsx`
**Route:** `/token-setup`
**Purpose:** HuggingFace token entry and validation.

Player pastes their HF access token. Screen calls `modelContext.testConnection()` to validate it against the HF API, shows success/error state. On success: `modelContext.saveToken()` persists to localStorage.

**Connects to:** `ModelContext`, `modelService.testConnection()`

---

### `screens/ApiKeySetupScreen.tsx`
**Route:** `/api-key-setup`
**Purpose:** API key entry for Gemini, OpenAI, Claude, or DeepSeek.

Detects current provider, shows appropriate label and help link. On submit: `modelContext.saveApiKey(provider, key)`.

**Connects to:** `ModelContext`

---

### `screens/ModelSelectionScreen.tsx`
**Route:** `/model-selection`
**Purpose:** HuggingFace model selection.

Shows `RECOMMENDED_MODELS` cards and a custom model input. Fetches available models from HF API (`modelContext.fetchModels()`). On select: `modelContext.selectModel(modelId)`.

**Connects to:** `ModelContext`, `constants.RECOMMENDED_MODELS`

---

### `screens/NovelSelectionScreen.tsx`
**Route:** `/novels` and `/`
**Purpose:** Main library screen. Lists all saved novels.

Loads `listNovels()` and `getChaptersByNovel()` for each novel in parallel (to show chapter counts). Renders a card per novel with gradient tinted by genre color. Tap → navigate to `/story/:id`. Has double-confirm delete.

**Connects to:** `novelService.listNovels()`, `chapterDB.getChaptersByNovel()`, `constants.GENRES`

---

### `screens/GenrePickerScreen.tsx`
**Route:** `/genre-picker`
**Purpose:** 4-step novel creation wizard.

**Step 1 — Genre:** Grid of 20 genre cards. Select → advances to step 2.

**Step 2 — Setup:** Form fields:
- Novel Title (required)
- MC Name (required)
- World Name (optional)
- Starting Location (dropdown from `GENRE_STARTING_LOCATIONS[genre]` + custom input)
- Story Seed/Hook (textarea)
  
**Step 3 — MC Traits:** 4 dropdown selectors (Personality, Attitude, Risk Tolerance, Altruism) using `MC_TRAITS` options. Free-form text input fallback per trait. Skippable.

**Step 4 — Starting Skills:** `GENRE_STARTING_SKILLS[genre]` list with +/- buttons. Progress bar per skill. Points left counter. Add custom skill button. Skippable.

On create:
1. `presetManager.loadAll()`
2. `novelService.startNewNovel({title, genre, mcName, worldName, storySeed, startingLocation, mcTraits, startingSkills})`
3. `StoryContext.dispatch SET_NOVEL`
4. Navigate to `/story/:novelId`

**Connects to:** `novelService`, `presetManager`, `StoryContext`, `genreStartingSkills`, `genreStartingLocations`, `constants`

---

### `screens/StoryScreen.tsx`
**Route:** `/story/:novelId`
**Purpose:** The main gameplay screen. The most complex screen in the app.

**Layout (top to bottom):**
1. **Top Bar** — back button, chapter label + location, Pilot Mode toggle
2. **Pilot Pause Banner** — animated yellow bar with resume button
3. **Streaming Bar** — live token preview during AI generation
4. **Skill Unlock Toast** — purple toast for newly unlocked skills
5. **Error Banner** — red error with dismiss
6. **Bubble Scroll Area** — the chat feed (narrator + NPC + player bubbles)
7. **Interaction Area** — choice buttons + custom action input (hidden while generating)
8. **Bottom Navigation** — 4 tabs: Characters, Status, World, Ask Eden
9. **Panels** — 5 slide-up bottom sheets (one per tab + inventory)
10. **Overlays** — LevelUpOverlay, SkillTreeOverlay, LoadingOverlay

**Initialization sequence:**
1. `loadNovel(novelId)` → sets novel state
2. `presetManager.loadAll()` → loads all preset strings
3. `loadWorldState(novelId)` → restores chapter/location/arc
4. `getCharactersByNovel(novelId)` → finds MC uid
5. `StoryContext.dispatch SET_NOVEL`
6. Restores bubbles from `localStorage['eden_bubbles_{novelId}']`
7. `reloadProgression(novelId, mc.internal_uid)`
8. If no bubbles → calls `handleOpeningScene()`

**`handleOpeningScene()`:**
- Sets generating + passive mode
- Adds a streaming bubble placeholder
- Calls `generateNovelOpening()` — streams tokens → `UPDATE_STREAMING`
- After complete: clears bubbles, calls `processParsedOutput()` to render real bubbles
- Saves to localStorage

**`handleAction(action)`:**
- Adds player bubble (isUser=true)
- Calls `generateNextScene()` — streams tokens
- Calls `processParsedOutput()` — renders NPC/narrator bubbles
- `incrementActionCount()` — auto-chapter if ≥ 20
- Saves to localStorage
- If pilot mode + not paused → schedules `runPilotDecision()` after 1.5s

**`processParsedOutput(rawText, genre, mcName)`:**
- Calls `parseNarrativeTags()` + `parseBubbles()`
- For each bubble: checks `isMCSpeaker()` to skip MC dialogue
- Adds each bubble with `settings.bubbleDelay` animation pause between them
- Dispatches SET_INTERACTION with choices from parsed tags

**`runPilotDecision()`:**
- Reads current choices and world state
- Calls `makePilotDecision()` with story context
- Calls `handleAction(chosen_choice)`

**Connects to:** `StoryContext`, `ProgressionContext`, `AppContext`, `novelService`, `orchestrationService`, `chapterService`, `pilotService`, `tagParser`, `characterDB`, `worldStateService`, `presetManager`

---

### `screens/SettingsScreen.tsx`
**Route:** `/settings`
**Purpose:** App configuration and cloud sync controls.

Settings controls (all dispatch to `AppContext`):
- Theme selector
- Bubble delay slider
- Max tokens slider
- Temperature slider
- Text size selector
- Pilot sensitivity
- Auto-chapter interval

Also shows MongoDB connection status and a "Test Connection" button that calls `checkMongoConnection()`.

**Connects to:** `AppContext`, `ModelContext`, `mongoSync.checkMongoConnection()`

---

### `screens/ChapterHistoryScreen.tsx`
**Route:** `/chapters/:novelId`
**Purpose:** Browse all completed chapters of a novel.

Loads `getChaptersByNovel(novelId)` and displays each chapter as a card with title, summary, and chapter number. Tapping a chapter may navigate to a timeline branch.

**Connects to:** `chapterDB`

---

### `screens/TimelineBranchScreen.tsx`
**Route:** `/timeline/:novelId`
**Purpose:** Timeline branching interface for creating alternate story paths.

Displays timeline tree. Allows branching from any past chapter point to create a parallel story without overwriting the original.

**Connects to:** `db.timelines` table, `novelDB`

---

## 11. Panels (Bottom-Sheet Overlays)

**Location:** `src/panels/`

All panels are slide-up bottom sheets that appear over the story screen. They use `AnimatedPanel` wrapper with Framer Motion.

---

### `panels/CharacterPanel.tsx`
**Tab:** Characters
**Purpose:** Displays all characters in the current novel organized by tabs (All / Alive / Dead).

Shows per character:
- Portrait initials + color (from `portraitService`)
- Name, role, status badge
- Location (if tracked)
- Relationship bar (if data exists)
- Genre-specific metadata fields

**Connects to:** `characterDB`, `portraitService`, `genreStats`

---

### `panels/StatusPanel.tsx`
**Tab:** Status
**Purpose:** The RPG stats dashboard. Shows current level, rank, all genre stats with progress bars, unspent points, and skill count.

Has a "Skill Tree" button that closes the panel and opens `SkillTreeOverlay`.

**Connects to:** `ProgressionContext`, `genreStats`, `constants.RANK_NAMES`

---

### `panels/WorldPanel.tsx`
**Tab:** World
**Purpose:** Current world state visualization. Shows location, arc, time of day, weather, day number, recent world events, active factions, established locations.

**Connects to:** `worldStateService.loadWorldState()`

---

### `panels/AskEdenPanel.tsx`
**Tab:** Ask Eden
**Purpose:** Chat interface with the story guide AI. Player types a question, Eden answers about past events.

Maintains local `messages: AskEdenMessage[]` state. On submit: calls `askEdenService.askEden()`, appends response.

**Connects to:** `askEdenService`

---

### `panels/InventoryPanel.tsx`
**Tab:** (accessed from Status or separate tab)
**Purpose:** Shows the MC's inventory items and currency.

**Connects to:** `inventoryDB`

---

## 12. Overlays (Full-Screen Modal Layers)

**Location:** `src/overlays/`

---

### `overlays/LevelUpOverlay.tsx`
**Purpose:** Animated full-screen level-up celebration shown when `StoryContext.pendingLevelUp` is non-null.

Displays:
- Old level → New level
- Old rank → New rank (with glow if rank tier changed)
- Stats gained grid (each stat key + delta)
- Newly unlocked skill card (name, description, rarity badge, evolution hint)
- Unspent points counter
- +/- buttons to allocate unspent points to stats (calls `progressionService.spendStatPoints()`)
- "Continue Story" button that dispatches `SET_LEVEL_UP: null`

**Connects to:** `ProgressionContext`, `progressionService.spendStatPoints()`, `StoryContext`

---

### `overlays/SkillTreeOverlay.tsx`
**Purpose:** Full-screen skill tree display showing all unlocked skills with rarity colors.

Renders a grid of `SkillCard` components. Filter by rarity. Shows evolution hints.

**Connects to:** `ProgressionContext.skills[]`

---

## 13. Components

**Location:** `src/components/`

---

### Chat Components (`components/chat/`)

**`MessageBubble.tsx`** — A single chat message bubble. If `isUser=true`: right-aligned, user color. If speaker present: colored left-aligned bubble with speaker name badge. Renders markdown-lite (bold with `**`, italic with `_`). Animates in via Framer Motion `fadeIn`.

**`NarratorBubble.tsx`** — Narrator text line. Full-width, italic, gray. No speaker badge. Animates in differently from dialogue bubbles. Handles `isStreaming` state (shows cursor blink).

**`TypingIndicator.tsx`** — Three animated dots shown while AI is generating but before any tokens arrive. Pulses in and out.

**`CharacterAvatar.tsx`** — Circle avatar with initials + background color. Used in `CharacterPanel`.

---

### Choice Components (`components/choice/`)

**`ChoiceButton.tsx`** — Styled button for story choice options. Shows choice index badge + text. Animates in from bottom. Disabled while generating.

**`CustomActionInput.tsx`** — Text input + send button at the bottom of the story screen. Player types freeform actions here. Submits on Enter or button press. Disabled while generating.

---

### Common Components (`components/common/`)

**`AnimatedPanel.tsx`** — Bottom-sheet wrapper. Uses Framer Motion `y` animation (slides up from off-screen). Takes `open` + `onClose` props. Renders children inside a styled dark panel with drag handle indicator.

**`LoadingOverlay.tsx`** — Full-screen dark overlay with spinner + message text. Shown during novel initialization.

**`GenreBadge.tsx`** — Small badge chip showing genre name + icon. Used in novel cards.

**`ConnectionChip.tsx`** — Small status chip showing AI connection state (connected/disconnected/loading). Used in settings.

---

### Progression Components (`components/progression/`)

**`StatBar.tsx`** — Horizontal progress bar for a single stat. Shows stat name, value, and a filled bar (value/30 * 100%). Used in StatusPanel and LevelUpOverlay.

**`RankBadge.tsx`** — Styled badge showing current rank tier. Color-coded by tier (bronze/silver/gold/platinum/diamond etc.).

**`SkillCard.tsx`** — Card showing a skill's name, description, rarity badge (common=gray, rare=blue, epic=purple, legendary=orange/gold), and evolution hint. Used in SkillTreeOverlay and LevelUpOverlay.

---

### UI Components (`components/ui/`)

**Purpose:** Shadcn/Radix UI component library. These are pre-built accessible primitives styled with Tailwind CSS. The app uses these for complex UI elements.

Complete list of UI components (each is a separate file):
`accordion`, `alert-dialog`, `alert`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button-group`, `button`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `empty`, `field`, `form`, `hover-card`, `input-group`, `input-otp`, `input`, `item`, `kbd`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `spinner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toaster`, `toggle-group`, `toggle`, `tooltip`

Most of these are installed but not actively used in the core gameplay loop. The app primarily uses custom-styled Tailwind divs/buttons in screens and panels.

---

## 14. Hooks

**Location:** `src/hooks/`

**`hooks/use-mobile.tsx`** — Returns a boolean `isMobile` based on a CSS media query `(max-width: 768px)`. Used to conditionally adjust layouts.

**`hooks/use-toast.ts`** — Sonner toast notification hook. Provides `toast.success()`, `toast.error()`, etc. Wraps the Sonner library.

---

## 15. API Server

**Location:** `artifacts/api-server/src/`

The API server is an Express 5 application that serves as a backend for MongoDB cloud sync. It is **not required** for gameplay — the game works fully offline without it.

---

### `api-server/src/index.ts`
**Entry point.** Reads `PORT` from environment (injected by Replit workflow), validates it, calls `app.listen(port)`. Logs `"Server listening"` on success.

**Imports:** `app.ts`, `lib/logger.ts`

---

### `api-server/src/app.ts`
**Express application factory.** Configures middleware stack and mounts the router.

**Middleware (in order):**
1. `pino-http` — request/response structured logging (logs method, URL, status code)
2. `cors()` — allows all origins (dev mode)
3. `express.json()` — parses JSON request bodies
4. `express.urlencoded({ extended: true })` — parses form data

**Router:** `app.use("/api", router)` — all routes are prefixed with `/api`

**Imports:** `routes/index.ts`, `lib/logger.ts`

---

### `api-server/src/lib/logger.ts`
**Purpose:** Creates and exports a Pino logger instance configured for the runtime environment (pretty-print in dev, JSON in production).

**Used by:** `index.ts`, `app.ts` (via pino-http)

---

### `api-server/src/routes/index.ts`
**Purpose:** Root router that mounts all sub-routers.

```
router.use(healthRouter)   → /api/healthz
router.use(mongoRouter)    → /api/mongo/*
```

---

### `api-server/src/routes/health.ts`
**Route:** `GET /api/healthz`
**Purpose:** Health check endpoint. Used by the platform to verify the server is running.

Returns `{ status: "ok" }` validated through `HealthCheckResponse` Zod schema from `@workspace/api-zod`.

---

### `api-server/src/routes/mongo.ts`
**Purpose:** All MongoDB synchronization routes. Manages a lazy-initialized `MongoClient` singleton.

**MongoDB connection:** `getDb()` lazily connects to `MONGODB_URI` env var and returns the `"eden_novel"` database.

**Routes:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/mongo/status` | Connection health check → `{ status: "connected" \| "disconnected" }` |
| `POST` | `/api/mongo/novel/:novelId` | Upsert a novel document (by `novel_id`) |
| `GET` | `/api/mongo/novel/:novelId` | Fetch a novel document |
| `POST` | `/api/mongo/chapter/:novelId/:chapterNumber` | Upsert a chapter document |
| `GET` | `/api/mongo/chapters/:novelId` | All chapters for a novel, sorted by chapter_number |
| `POST` | `/api/mongo/progression/:novelId` | Upsert progression document |
| `POST` | `/api/mongo/sync/:novelId` | **Batch sync** — accepts `{ novel, chapters[], characters[], progression, skills[], worldState }` and upserts all in parallel |

**Upsert strategy:** All writes use MongoDB `updateOne(..., { $set: data }, { upsert: true })` so the same endpoint safely handles both new and existing records.

---

## 16. Shared Libraries (`lib/`)

---

### `lib/api-spec/`
**Purpose:** The OpenAPI contract definition for the API server.

**`openapi.yaml`:** Defines the API spec:
- One endpoint: `GET /healthz` → `HealthStatus { status: string }`
- This spec is the source of truth for code generation

**`orval.config.ts`:** Code generation configuration. Tells Orval to generate:
- React Query hooks → `lib/api-client-react/src/generated/`
- Zod validation schemas → `lib/api-zod/src/generated/`

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

---

### `lib/api-zod/`
**Purpose:** Auto-generated Zod schemas from the OpenAPI spec.

**`src/generated/types/healthStatus.ts`** — exports `HealthStatus` Zod schema
**`src/generated/api.ts`** — exports `HealthCheckResponse` schema
**`src/index.ts`** — re-exports all schemas

**Used by:** `api-server/src/routes/health.ts` (for response validation)

---

### `lib/api-client-react/`
**Purpose:** Auto-generated React Query hooks from the OpenAPI spec.

**`src/generated/api.ts`** — exports `useHealthCheck` React Query hook
**`src/generated/api.schemas.ts`** — TypeScript types
**`src/custom-fetch.ts`** — custom fetch adapter
**`src/index.ts`** — barrel re-export

Used by any frontend that wants type-safe API calls (currently not heavily used by eden-novel since it talks directly to IndexedDB and uses `mongoSync.ts` for API calls).

---

### `lib/db/`
**Purpose:** Drizzle ORM schema and connection for the PostgreSQL database (used by the API server for relational data if needed).

**`src/schema/index.ts`** — Drizzle table definitions
**`src/index.ts`** — exports `db` client and schema
**`drizzle.config.ts`** — migration and push configuration

Run migrations: `pnpm --filter @workspace/db run push`

Requires: `DATABASE_URL` environment variable

---

## 17. Connection Map: Who Imports What

This section shows the complete import graph in a flat format. Read as: **File** → imports from → **[dependencies]**

### Eden Novel Frontend

```
main.tsx
  → App.tsx, index.css

App.tsx
  → context/AppContext, ModelContext, StoryContext, ProgressionContext
  → screens/* (all 10)
  → wouter

context/AppContext.tsx
  → (no local imports)

context/ModelContext.tsx
  → services/modelService

context/StoryContext.tsx
  → services/progressionService (LevelUpResult type)

context/ProgressionContext.tsx
  → database/progressionDB

services/modelService.ts
  → (no local imports — self-contained class)

services/presetManager.ts
  → services/modelService (to check provider for grok_content_policy)

services/orchestrationService.ts
  → modelService, presetManager, worldStateService, memoryService
  → grokContextBuilder, tagParser
  → database/characterDB, inventoryDB, sceneDB
  → services/chapterService, progressionService, novelService

services/worldStateService.ts
  → database/novelDB

services/memoryService.ts
  → database/memoryDB

services/chapterService.ts
  → database/chapterDB, characterDB
  → services/worldStateService, modelService, presetManager, memoryService

services/progressionService.ts
  → database/progressionDB
  → core/genreStats, core/constants
  → services/modelService, presetManager

services/pilotService.ts
  → services/modelService, presetManager

services/askEdenService.ts
  → services/modelService, presetManager, worldStateService, memoryService
  → database/characterDB, chapterDB

services/novelService.ts
  → database/novelDB, characterDB, inventoryDB
  → services/progressionService

services/mongoSync.ts
  → database/novelDB, characterDB, chapterDB, progressionDB

services/grokContextBuilder.ts
  → database/db (direct Dexie access)

services/validationService.ts
  → core/genreStats

services/portraitService.ts
  → core/constants

parsers/tagParser.ts
  → (no local imports)

core/constants.ts
  → (no local imports)

core/genreStats.ts
  → (no local imports)

core/genreStartingSkills.ts
  → (no local imports)

core/genreStartingLocations.ts
  → (no local imports)

core/utils.ts
  → (no local imports)

screens/StoryScreen.tsx
  → context/StoryContext, ProgressionContext, AppContext
  → services/novelService, orchestrationService, chapterService, pilotService
  → parsers/tagParser
  → database/characterDB
  → services/worldStateService, presetManager
  → core/utils
  → database/db (Novel type)
  → components/chat/*, components/choice/*, components/common/LoadingOverlay
  → panels/*, overlays/*

screens/GenrePickerScreen.tsx
  → context/StoryContext
  → services/novelService, presetManager
  → core/genreStartingSkills, genreStartingLocations, constants

screens/NovelSelectionScreen.tsx
  → services/novelService
  → database/chapterDB
  → core/constants, utils

screens/SettingsScreen.tsx
  → context/AppContext, ModelContext
  → services/mongoSync

panels/AskEdenPanel.tsx
  → services/askEdenService

panels/StatusPanel.tsx
  → context/ProgressionContext
  → core/genreStats, constants

panels/WorldPanel.tsx
  → services/worldStateService

panels/CharacterPanel.tsx
  → database/characterDB
  → services/portraitService

panels/InventoryPanel.tsx
  → database/inventoryDB

overlays/LevelUpOverlay.tsx
  → context/ProgressionContext
  → services/progressionService

overlays/SkillTreeOverlay.tsx
  → context/ProgressionContext

database/db.ts
  → (dexie only — no local imports)

database/novelDB.ts   → database/db
database/characterDB.ts → database/db, core/constants
database/chapterDB.ts → database/db
database/sceneDB.ts   → database/db
database/progressionDB.ts → database/db
database/memoryDB.ts  → database/db
database/inventoryDB.ts → database/db
```

### API Server

```
index.ts → app.ts, lib/logger
app.ts → routes/index, lib/logger
routes/index.ts → routes/health, routes/mongo
routes/health.ts → @workspace/api-zod
routes/mongo.ts → mongodb
lib/logger.ts → pino
```

---

## Quick Reference: File Purposes at a Glance

| File | One-Line Summary |
|------|-----------------|
| `main.tsx` | React DOM mount point |
| `App.tsx` | Context providers + route guarding + navigation |
| `AppContext.tsx` | Settings state (theme, tokens, temperature) → localStorage |
| `ModelContext.tsx` | React bridge to modelService singleton |
| `StoryContext.tsx` | Real-time story state (bubbles, choices, generating, pilot) |
| `ProgressionContext.tsx` | RPG level/stats/skills cache (reloaded on demand) |
| `database/db.ts` | Dexie IndexedDB schema with 13 tables |
| `database/novelDB.ts` | Novel + world_state CRUD |
| `database/characterDB.ts` | Character + relationship CRUD |
| `database/chapterDB.ts` | Chapter CRUD |
| `database/sceneDB.ts` | Scene archive CRUD |
| `database/progressionDB.ts` | RPG data CRUD |
| `database/memoryDB.ts` | Memory CRUD with archive rotation |
| `database/inventoryDB.ts` | Inventory + items CRUD |
| `nova-server.js` | Nova Sonic backend — Express + Socket.IO, TTS + story generation via Amazon Bedrock |
| `services/modelService.ts` | AI provider abstraction (7 providers, streaming) |
| `services/novaSonicService.ts` | Nova Sonic frontend client — TTS fetch, PCM decode, audio queue, deduplication |
| `services/presetManager.ts` | Loads + stacks preset strings into system prompts |
| `services/orchestrationService.ts` | Story generation + tag processing + side-effects |
| `services/worldStateService.ts` | Typed world state load/save/update |
| `services/memoryService.ts` | Record + retrieve story memories |
| `services/chapterService.ts` | AI chapter title/summary + chapter record creation |
| `services/progressionService.ts` | Level-up, stat allocation, skill generation |
| `services/pilotService.ts` | AI autopilot choice selection |
| `services/askEdenService.ts` | Story guide AI Q&A |
| `services/novelService.ts` | Novel creation + management (multi-table) |
| `services/mongoSync.ts` | Cloud backup to MongoDB via API server |
| `services/grokContextBuilder.ts` | Full IndexedDB dump for large-context AI prompts |
| `services/validationService.ts` | Anti-hallucination + data validation |
| `services/portraitService.ts` | Character avatar initials + color |
| `parsers/tagParser.ts` | Extracts /tag:value/ events from AI output |
| `core/constants.ts` | Genres, models, rank names, colors |
| `core/genreStats.ts` | 7 stat keys per genre + skill fallbacks |
| `core/genreStartingSkills.ts` | 8 starting skills per genre + MC traits |
| `core/genreStartingLocations.ts` | Starting location options per genre |
| `core/utils.ts` | generateId(), formatDate() |
| `presets/*.ts` | AI system prompt strings (genre rules, leveling, UI format, etc.) |
| `screens/StoryScreen.tsx` | Main gameplay: bubbles, choices, pilot, panels |
| `screens/GenrePickerScreen.tsx` | 4-step novel creation wizard |
| `screens/NovelSelectionScreen.tsx` | Novel library (list + delete) |
| `screens/SettingsScreen.tsx` | App settings + cloud sync |
| `screens/ProviderSelectionScreen.tsx` | AI provider picker |
| `screens/HFTokenScreen.tsx` | HuggingFace token setup |
| `screens/ApiKeySetupScreen.tsx` | API key setup (Gemini/OpenAI/Claude/DeepSeek/Nova) |
| `screens/ModelSelectionScreen.tsx` | HF model picker |
| `screens/ChapterHistoryScreen.tsx` | Chapter archive browser |
| `screens/TimelineBranchScreen.tsx` | Timeline branching UI |
| `panels/CharacterPanel.tsx` | Character roster sheet |
| `panels/StatusPanel.tsx` | RPG stats dashboard |
| `panels/WorldPanel.tsx` | World state display |
| `panels/AskEdenPanel.tsx` | Story guide chat |
| `panels/InventoryPanel.tsx` | Items + currency |
| `overlays/LevelUpOverlay.tsx` | Level-up celebration + stat allocation |
| `overlays/SkillTreeOverlay.tsx` | All skills grid display |
| `api-server/src/index.ts` | Express server entry point |
| `api-server/src/app.ts` | Express app + middleware |
| `api-server/src/lib/logger.ts` | Pino logger |
| `api-server/src/routes/health.ts` | GET /api/healthz |
| `api-server/src/routes/mongo.ts` | MongoDB sync routes (/api/mongo/*) |
| `lib/api-spec/openapi.yaml` | OpenAPI contract (source of truth for codegen) |
| `lib/api-zod/` | Auto-generated Zod schemas |
| `lib/api-client-react/` | Auto-generated React Query hooks |
| `lib/db/` | Drizzle ORM schema for PostgreSQL |

---

*Generated from full source analysis of Eden Novel v1.0 — May 2026. Updated May 2026 to include Amazon Nova 2 Sonic (nova-server.js backend, novaSonicService.ts, TTS, Stop/Resume, provider integration).*


---

# Part II — Eden Novel Source Code Reference

*The following is the detailed per-file code reference for .*

# How Eden Novel Works — Complete Technical Reference

This document is the authoritative technical reference for the Eden Novel codebase. It covers every file, every service, every database table, every preset, and every connection between them. It includes all systems added during the Scene Awareness Engine update. Nothing is omitted.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Directory Structure](#2-directory-structure)
3. [Application Entry & Routing](#3-application-entry--routing)
4. [Context & State Management](#4-context--state-management)
5. [Database Layer](#5-database-layer)
6. [Service Layer](#6-service-layer)
7. [The Preset System](#7-the-preset-system)
8. [The Tag Parser](#8-the-tag-parser)
9. [Screens](#9-screens)
10. [Panels & Overlays](#10-panels--overlays)
11. [Components](#11-components)
12. [Core Constants & Genre Data](#12-core-constants--genre-data)
13. [Full Data Flow — Scene Generation](#13-full-data-flow--scene-generation)
14. [New Systems Added](#14-new-systems-added)
15. [Connection Map](#15-connection-map)

---

## 1. Project Overview

Eden Novel is a fully client-side AI-powered interactive fiction engine. There is no backend server. All persistent data lives in IndexedDB via Dexie.js. All AI calls go directly from the browser to the selected AI provider. The application is built with React 19, Vite, TypeScript, Tailwind CSS, and Framer Motion.

**Tech stack:**
- **React 19** — UI layer
- **Vite** — build tool and dev server
- **TypeScript 5.9 strict** — all types explicit, zero implicit `any`
- **Wouter** — hash-based client-side routing
- **Dexie.js** — IndexedDB abstraction (13 tables)
- **Framer Motion** — animations for all transitions, bubbles, overlays
- **Tailwind CSS** — utility-first styling with dark anime palette
- **import.meta.glob** — Vite's dynamic import for loading all preset `.ts` files

**AI providers supported:**
- HuggingFace Router (any open-source model via `router.huggingface.co`)
- Grok by xAI (`grok-3-fast`, 131K context)
- Gemini (`gemini-2.0-flash` with `gemini-1.5-flash` fallback)
- OpenAI (`gpt-4o-mini` with `gpt-4o` fallback)
- Claude (`claude-3-5-haiku-20241022`)
- DeepSeek (`deepseek-chat`)

Grok, Gemini, OpenAI, Claude, and DeepSeek all use large-context mode (`buildFullGrokContext`), which assembles the entire story history on every generation. HuggingFace uses a curated context window (last 3 scenes + top 10 memories + world state summary).

---

## 2. Directory Structure

```
artifacts/eden-novel/
├── README.md                          ← Project overview (user-facing)
├── src/
│   ├── main.tsx                       ← React app bootstrap
│   ├── App.tsx                        ← Router + provider tree + auth guards
│   ├── index.css                      ← Global Tailwind styles
│   │
│   ├── context/                       ← React context providers
│   │   ├── AppContext.tsx             ← Global UI state (theme, etc.)
│   │   ├── ModelContext.tsx           ← AI provider/token state, exposes to all screens
│   │   ├── ProgressionContext.tsx     ← Live progression data (level, stats, skills)
│   │   └── StoryContext.tsx           ← Active story state (bubbles, choices, pilot, etc.)
│   │
│   ├── core/                          ← Static configuration and genre data
│   │   ├── constants.ts              ← GENRES array, RANK_NAMES, BUBBLE_COLORS, recommended models
│   │   ├── genreSkillPaths.ts        ← Skill path names and bonus choices per genre
│   │   ├── genreStartingLocations.ts ← Preset starting location options per genre
│   │   ├── genreStartingSkills.ts    ← Starting skill definitions, MC traits, allocation config
│   │   ├── genreStats.ts             ← Stat key names per genre + skill fallbacks
│   │   └── utils.ts                  ← generateId(), formatDate(), etc.
│   │
│   ├── database/                      ← Dexie.js tables and DB access functions
│   │   ├── db.ts                     ← Schema, all TypeScript interfaces, version migrations
│   │   ├── novelDB.ts                ← Novel CRUD, world state read/write, mcIsReborn detection
│   │   ├── characterDB.ts            ← Character CRUD, createCharacter, markCharacterIntroduced
│   │   ├── chapterDB.ts              ← Chapter CRUD, getLastChapter, getChapterByNumber
│   │   ├── sceneDB.ts                ← Scene CRUD, getLastScenes
│   │   ├── memoryDB.ts               ← Memory CRUD, getTopMemories, archiveOldMemories
│   │   ├── progressionDB.ts          ← Progression CRUD, addSkill
│   │   ├── inventoryDB.ts            ← Inventory CRUD, addItem, removeItem, initInventory
│   │   └── characterDB.ts            ← Relationships, updateRelationship
│   │
│   ├── services/                      ← Business logic, AI orchestration
│   │   ├── modelService.ts           ← AI provider abstraction, streaming, all 6 providers
│   │   ├── orchestrationService.ts   ← Main scene generation pipeline (THE BRAIN)
│   │   ├── presetManager.ts          ← Preset loader and stacker, getGenreSystemPrompt()
│   │   ├── worldStateService.ts      ← Load/save world state, incrementSceneCountAtLocation()
│   │   ├── novelService.ts           ← startNewNovel(), listNovels(), loadNovel()
│   │   ├── chapterService.ts         ← generateChapterTitle/Summary, closeChapterAndBeginNext()
│   │   ├── memoryService.ts          ← recordMemory(), buildMemoryContext()
│   │   ├── progressionService.ts     ← triggerLevelUp(), spendStatPoints(), initPlayerProgression()
│   │   ├── grokContextBuilder.ts     ← buildFullGrokContext() for large-context providers
│   │   ├── portraitService.ts        ← assignPortrait(), portrait matching logic
│   │   ├── pilotService.ts           ← Pilot Mode AI decision-making
│   │   ├── askEdenService.ts         ← Ask Eden query generation
│   │   ├── validationService.ts      ← Output sanity checks
│   │   └── mongoSync.ts              ← Optional sync stub (unused in browser mode)
│   │
│   ├── parsers/
│   │   └── tagParser.ts              ← parseNarrativeTags(), parseBubbles(), extractSpeakerNames()
│   │
│   ├── presets/                       ← All AI prompt preset files (exported strings)
│   │   ├── base_narrator.ts          ← Core storytelling rules, MC protection ← UPDATED
│   │   ├── messenger_bubble_ui.ts    ← Bubble format rules
│   │   ├── scene_awareness_engine.ts ← Scene progression, NPC intro, choice rules ← NEW
│   │   ├── world_state_persistence.ts← World state tracking rules
│   │   ├── character_introduction_protocol.ts ← 4-step intro sequence ← REWRITTEN
│   │   ├── character_metadata_expansion.ts    ← Character depth and personality
│   │   ├── leveling_system.ts        ← Level-up trigger rules
│   │   ├── mc_traits_system.ts       ← MC personality influence on narration
│   │   ├── chapter_system.ts         ← Chapter open/close rules
│   │   ├── story_seed_integration.ts ← How to use the player's story hook
│   │   ├── story_opening_rules.ts    ← Rules specific to novel's first scene
│   │   ├── starting_location.ts      ← How to anchor scene to chosen location
│   │   ├── grok_content_policy.ts    ← Grok-specific content policy (added for Grok only)
│   │   ├── pilot_autopilot_decision.ts← Pilot Mode decision-making rules
│   │   ├── ask_eden_core.ts          ← Ask Eden answer rules
│   │   ├── ask_eden_system_explainer.ts← Ask Eden system context
│   │   ├── chapter_generation.ts     ← Chapter title generation rules
│   │   ├── chapter_summary.ts        ← Chapter summary generation rules
│   │   ├── ai_skill_generation.ts    ← Skill generation format rules
│   │   ├── types.ts                  ← Shared preset type definitions
│   │   │
│   │   ├── [genre]_genre.ts (×20)    ← Genre world rules + PROGRESSION ENFORCEMENT block ← UPDATED
│   │   │   apocalypse, crime_noir, cultivation, cyberpunk, detective, fantasy,
│   │   │   historical, horror, isekai, mafia, military_war, romance, school,
│   │   │   slice_of_life, space_scifi, superpower, survival, thriller, vampire, zombie
│   │   │
│   │   └── [genre]_progression.ts (×12) ← Genre-specific power rank systems
│   │       cultivation, cyberpunk, fantasy, horror, isekai, mafia, romance,
│   │       school, superpower, thriller, vampire, zombie
│   │
│   ├── screens/                       ← Full-page route components
│   │   ├── ProviderSelectionScreen.tsx← Step 1: choose AI provider
│   │   ├── HFTokenScreen.tsx          ← HuggingFace token entry
│   │   ├── ApiKeySetupScreen.tsx      ← API key entry for Gemini/OpenAI/Claude/DeepSeek
│   │   ├── ModelSelectionScreen.tsx   ← HuggingFace model picker
│   │   ├── NovelSelectionScreen.tsx   ← Library of existing novels + create new
│   │   ├── GenrePickerScreen.tsx      ← 4-step novel creation (genre, setup, traits, skills)
│   │   ├── StoryScreen.tsx            ← Main story view (bubbles, choices, pilot, panels)
│   │   ├── SettingsScreen.tsx         ← AI provider/token settings
│   │   ├── ChapterHistoryScreen.tsx   ← Chapter list with summaries
│   │   └── TimelineBranchScreen.tsx   ← Timeline branching UI
│   │
│   ├── panels/                        ← Slide-up bottom sheet panels
│   │   ├── CharacterPanel.tsx         ← Active cast with roles, status, relationships
│   │   ├── StatusPanel.tsx            ← Level, rank, stats, unspent points
│   │   ├── InventoryPanel.tsx         ← Items and currency per character
│   │   ├── WorldPanel.tsx             ← World state fields, events, factions
│   │   └── AskEdenPanel.tsx           ← Ask Eden Q&A interface
│   │
│   ├── overlays/                      ← Full-screen modal overlays
│   │   ├── LevelUpOverlay.tsx         ← Cinematic level-up, stat allocation, skill reveal
│   │   └── SkillTreeOverlay.tsx       ← Visual skill tree by path with zoom
│   │
│   ├── components/
│   │   ├── chat/
│   │   │   ├── CharacterAvatar.tsx    ← Avatar (portrait image or initials fallback)
│   │   │   ├── MessageBubble.tsx      ← NPC/player bubble with color, avatar, animation
│   │   │   ├── NarratorBubble.tsx     ← Wide italic narrator prose card
│   │   │   └── TypingIndicator.tsx    ← Animated dots for AI thinking state
│   │   ├── choice/
│   │   │   ├── ChoiceButton.tsx       ← Glowing choice button with stagger animation
│   │   │   └── CustomActionInput.tsx  ← Freeform player text input
│   │   ├── common/
│   │   │   ├── AnimatedPanel.tsx      ← Reusable spring-animated bottom sheet
│   │   │   ├── ConnectionChip.tsx     ← AI provider connection status indicator
│   │   │   ├── GenreBadge.tsx         ← Genre pill with icon and color
│   │   │   └── LoadingOverlay.tsx     ← Full-screen loading spinner
│   │   ├── progression/
│   │   │   ├── RankBadge.tsx          ← Current rank display with glow
│   │   │   ├── SkillCard.tsx          ← Individual skill display with rarity color
│   │   │   └── StatBar.tsx            ← Animated stat bar with label and value
│   │   └── ui/                        ← shadcn/ui component library (accordion, dialog, etc.)
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx             ← Detects mobile viewport
│   │   └── use-toast.ts               ← Toast notification hook
│   │
│   ├── lib/
│   │   └── utils.ts                   ← cn() class merging utility (Tailwind + clsx)
│   │
│   ├── pages/
│   │   └── not-found.tsx              ← 404 fallback page
│   │
│   └── docs/
│       └── how.md                     ← This file
```

---

## 3. Application Entry & Routing

### `src/main.tsx`
The React entry point. Mounts `<App />` into `#root`. Imports Tailwind via `index.css`.

### `src/App.tsx`
Sets up the entire provider tree and routing. Every screen is wrapped in four context providers, in this order from outer to inner:

```
AppProvider
  ModelProvider
    StoryProvider
      ProgressionProvider
        WouterRouter (base = BASE_URL)
          GuardedRoutes
```

**GuardedRoutes** enforces the setup flow via `useEffect`:
- If no provider selected → redirect to `/provider-select`
- If Grok selected → skip all setup, go to `/novels`
- If API-key provider (Gemini, OpenAI, Claude, DeepSeek) without key → redirect to `/api-key-setup`
- If HuggingFace without token → redirect to `/token-setup`
- If HuggingFace with token but no model → redirect to `/model-selection`

**Route map:**

| Path | Screen |
|---|---|
| `/provider-select` | ProviderSelectionScreen |
| `/api-key-setup` | ApiKeySetupScreen |
| `/token-setup` | HFTokenScreen |
| `/model-selection` | ModelSelectionScreen |
| `/novels` | NovelSelectionScreen |
| `/genre-picker` | GenrePickerScreen |
| `/story/:novelId` | StoryScreen |
| `/settings` | SettingsScreen |
| `/chapters/:novelId` | ChapterHistoryScreen |
| `/timeline/:novelId` | TimelineBranchScreen |
| `/` | NovelSelectionScreen |

---

## 4. Context & State Management

### `src/context/ModelContext.tsx`
Wraps `modelService` in a React context. Exposes: `hfToken`, `selectedModel`, `provider`, `providerSelected`, `isConnected`, `isProviderReady`. Components use `useModel()` to read and react to provider changes. Drives the auth guard logic in `App.tsx`.

### `src/context/StoryContext.tsx`
The central state store for an active story session. Uses `useReducer`. Exported via `useStory()`.

**State shape (`StoryState`):**

| Field | Type | Purpose |
|---|---|---|
| `novelId` | `number \| null` | Active novel being played |
| `mcUid` | `string` | MC character's `internal_uid` |
| `genre` | `string` | Active genre slug |
| `timelineId` | `string` | Active timeline ID |
| `bubbles` | `Bubble[]` | All rendered story bubbles |
| `interactionMode` | enum | `cinematic \| decision \| roleplay \| passive` |
| `choices` | `string[]` | Current choice labels |
| `isGenerating` | `boolean` | True while AI is streaming |
| `pilotMode` | `boolean` | Pilot Mode on/off |
| `pilotPaused` | `boolean` | True when Pilot paused at pivot moment |
| `pilotPauseReason` | `string` | Reason message for Pilot pause |
| `pendingLevelUp` | `LevelUpResult \| null` | Queued level-up data to show overlay |
| `pendingSkillUnlocks` | `string[]` | Skills unlocked this scene |
| `currentChapter` | `number` | Current chapter number |
| `currentLocation` | `string` | Current world location |
| `currentArc` | `string` | Current narrative arc |
| `streamingText` | `string` | Live preview text during generation |
| `error` | `string \| null` | Error message |
| `actionCount` | `number` | Actions taken in current chapter |

**Actions:** `SET_NOVEL`, `LOAD_BUBBLES`, `ADD_BUBBLE`, `UPDATE_STREAMING`, `FINISH_STREAMING`, `SET_INTERACTION`, `SET_GENERATING`, `SET_PILOT`, `PILOT_PAUSE`, `PILOT_RESUME`, `SET_LEVEL_UP`, `ADD_SKILL_UNLOCK`, `CLEAR_SKILL_UNLOCKS`, `SET_CHAPTER`, `SET_LOCATION`, `SET_ARC`, `SET_ERROR`, `CLEAR_BUBBLES`, `INCREMENT_ACTION`, `SET_ACTION_COUNT`

**`Bubble` type:**
```typescript
{
  id: string;
  speaker?: string;       // NPC name (undefined = narrator)
  content: string;
  isNarrator?: boolean;
  isUser?: boolean;       // true = player action (right-aligned)
  isTyping?: boolean;     // shows typing indicator animation
  isStreaming?: boolean;
  bubbleColor?: string;   // character's assigned color
  timestamp: number;
}
```

### `src/context/ProgressionContext.tsx`
Provides live access to the player's level, rank, stats, and skills. Refreshes from IndexedDB when the novel changes or a level-up fires.

### `src/context/AppContext.tsx`
Global app-level state: theme preferences, UI toggles not specific to story.

---

## 5. Database Layer

### `src/database/db.ts` — Schema & Interfaces

The single Dexie.js database instance (`EdenNovelDB`, named `"EdenNovelDB"` in the browser). Defines all TypeScript interfaces and the schema version history.

**Current version: 4**

Version history:
- v1: Initial schema (all 13 tables)
- v2: Added `mc_traits_json`, `starting_skills_json`, `action_count` to novels
- v3: Added `current_location`, `has_introduced_self` to characters
- v4: Added `starting_location` to novels

**All 13 tables and their TypeScript interfaces:**

#### `novels`
```typescript
interface Novel {
  id?: number;
  title: string;
  genre: string;
  created_at: number;
  last_played_at: number;
  active_timeline_id: string;
  mc_portrait_path: string;
  total_chapters: number;
  story_seed: string;
  mc_name: string;
  world_name: string;
  mc_traits_json: string;          // JSON: { personality, attitude, riskTolerance, altruism }
  starting_skills_json: string;    // JSON: StartingSkillAllocation[]
  action_count: number;
  starting_location?: string;
}
```
Indexed by: `id`, `title`, `genre`, `created_at`, `last_played_at`, `active_timeline_id`

#### `chapters`
```typescript
interface Chapter {
  id?: number;
  novel_id: number;
  timeline_id: string;
  chapter_number: number;
  title: string;
  summary: string;
  created_at: number;
  character_snapshot_json: string;  // JSON snapshot of all characters at chapter close
  world_snapshot_json: string;      // JSON snapshot of WorldStateData at chapter close
}
```
Indexed by: `id`, `novel_id`, `timeline_id`, `chapter_number`, `created_at`

#### `scenes`
```typescript
interface Scene {
  id?: number;
  chapter_id: number;
  novel_id: number;
  timeline_id: string;
  scene_number: number;
  raw_output: string;               // Full AI output including all tags (preserved)
  parsed_bubbles_json: string;      // JSON: parsed bubble array
  interaction_mode: string;
  metadata_json: string;
  created_at: number;
}
```
Indexed by: `id`, `chapter_id`, `novel_id`, `timeline_id`, `scene_number`, `created_at`

#### `characters`
```typescript
interface Character {
  id?: number;
  novel_id: number;
  internal_uid: string;             // UUID, used as foreign key in relationships/inventory
  display_name: string;
  portrait_path: string;
  bubble_color: string;             // Hex color assigned from BUBBLE_COLORS
  status: string;                   // 'alive' | 'dead' | 'missing' | 'unknown'
  gender: string;
  role: string;                     // 'protagonist' | 'ally' | 'antagonist' | 'neutral' | 'supporting' | 'unknown' | 'npc'
  metadata_json: string;            // Freeform JSON for any extra data
  first_appeared_chapter: number;
  current_location: string;
  has_introduced_self: boolean;     // false until character speaks in a scene
  created_at: number;
}
```
Indexed by: `id`, `novel_id`, `internal_uid`, `display_name`, `status`, `role`, `created_at`

The `has_introduced_self` field is key to the Scene Awareness Engine. All non-protagonist characters start with `false`. It flips to `true` when the character speaks in a scene (detected by the `[CharacterName]:` pattern in AI output).

#### `character_relationships`
```typescript
interface CharacterRelationship {
  id?: number;
  novel_id: number;
  character_a_uid: string;
  character_b_uid: string;
  relationship_type: string;       // 'affinity' | 'trust' | 'fear' | 'rivalry'
  value: number;                   // Numeric score, positive or negative
  description: string;
  updated_at: number;
}
```

#### `world_state`
```typescript
interface WorldState {
  id?: number;
  novel_id: number;                // Unique index — one world state per novel
  state_json: string;              // JSON-encoded WorldStateData object
  updated_at: number;
}
```

The `state_json` field contains the full `WorldStateData` object (see `worldStateService.ts`). It is stored as a JSON blob so new fields can be added without schema migrations.

#### `progression_data`
```typescript
interface ProgressionData {
  id?: number;
  novel_id: number;
  character_uid: string;
  level: number;
  rank: string;
  stats_json: string;              // JSON: Record<string, number>
  unspent_points: number;
  active_path: string;
  paths_json: string;              // JSON: string[] (skill paths unlocked)
  updated_at: number;
}
```

#### `skill_registry`
```typescript
interface SkillRegistry {
  id?: number;
  novel_id: number;
  character_uid: string;
  skill_name: string;
  skill_description: string;
  skill_effects_json: string;      // JSON: { path: string }
  rarity: string;                  // 'common' | 'rare' | 'epic' | 'legendary'
  evolution_hint: string;
  is_active: boolean;
  unlocked_at: number;
}
```

#### `skill_tree_nodes`
```typescript
interface SkillTreeNode {
  id?: number;
  novel_id: number;
  character_uid: string;
  node_name: string;
  parent_node_id: number | null;
  path_name: string;
  is_unlocked: boolean;
  is_hidden: boolean;              // Hidden until narrative conditions unlock them
  required_level: number;
  genre: string;
}
```

#### `timelines`
```typescript
interface Timeline {
  id?: number;
  novel_id: number;
  parent_timeline_id: string | null;  // null = main timeline
  branch_point_chapter: number;
  branch_label: string;
  created_at: number;
  is_active: boolean;
}
```

#### `memories`
```typescript
interface Memory {
  id?: number;
  novel_id: number;
  timeline_id: string;
  content: string;                 // 300-char compressed summary of what happened
  relevance_tags: string;          // comma-separated: genre, arc, key characters
  importance_score: number;        // Higher = prioritized in context
  archived_at: number | null;      // Set when memory is evicted (keep max 30)
}
```

#### `inventory`
```typescript
interface Inventory {
  id?: number;
  novel_id: number;
  character_uid: string;
  items_json: string;              // JSON: array of item objects
  currency: number;
  currency_label: string;
  updated_at: number;
}
```

#### `presets_registry`
```typescript
interface PresetRegistry {
  id?: number;
  preset_name: string;
  preset_path: string;
  category: string;
  version: string;
  is_loaded: boolean;
  loaded_at: number;
}
```

---

### `src/database/novelDB.ts`

Handles novel CRUD and world state storage. The most important function here is `createNovel()`, which is called once per story creation and sets up the complete initial database state.

**`createNovel(data)`**
1. Inserts the `Novel` record into `db.novels`
2. Creates the main `Timeline` record
3. Runs **mcIsReborn detection** (see below)
4. Creates the `WorldState` record with `defaultWorldState` JSON
5. Returns the new `novelId`

**mcIsReborn auto-detection (added in Scene Awareness Engine update):**
```typescript
const reborKeywords = /\b(reborn|rebirth|past life|previous life|died|reincarn|transmigrat|regression|second chance|second life|another world|isekai|woke up (?:in|as)|returned to|transported to)\b/i;
const mcIsReborn = data.genre === 'isekai' || reborKeywords.test(data.story_seed || '');
```

Triggers if: genre is `isekai`, OR the story seed contains any of: `reborn`, `rebirth`, `past life`, `previous life`, `died`, `reincarnated`, `transmigrated`, `regression`, `second chance`, `second life`, `another world`, `isekai`, `woke up in/as`, `returned to`, `transported to`.

**`defaultWorldState` — complete initial object:**
```typescript
{
  genre: data.genre,
  active_novel_id: id,
  active_timeline_id: timelineId,
  current_chapter: 1,
  current_scene: 0,
  scene_count_since_chapter: 0,
  current_location: data.starting_location || 'Starting Location',
  current_arc: 'Prologue',
  time_of_day: 'morning',
  day_number: 1,
  weather: 'Clear',
  allowed_fields: [],
  forbidden_fields: [],
  enabled_systems: ['leveling', 'relationships'],
  established_locations: [],
  active_factions: [],
  world_events: [],
  emotional_state: 'neutral',
  narrative_pacing: 'establishing',
  pilot_mode_active: false,
  progression_state: { current_level: 1, current_rank: 'Bronze I', unspent_points: 0, active_path: '', stats: {} },
  active_character_uids: [],
  sceneCountAtLocation: 0,          // ← NEW: Scene Awareness Engine
  tensionLevel: 'low',              // ← NEW: Scene Awareness Engine
  mcIsReborn,                       // ← NEW: auto-detected above
}
```

Other functions: `getAllNovels()`, `getNovel(id)`, `updateNovelLastPlayed(id)`, `incrementNovelActionCount(id)`, `resetNovelActionCount(id)`, `deleteNovel(id)` (cascading delete across all 12 related tables), `getWorldState(novelId)`, `setWorldState(novelId, state)`.

---

### `src/database/characterDB.ts`

**`createCharacter(data)`**
Creates a character with an auto-generated `internal_uid` (UUID) and a randomly assigned `bubble_color` from `BUBBLE_COLORS`. Defaults `has_introduced_self` to:
- `true` if `data.role === 'protagonist'`
- `data.has_introduced_self ?? false` for all others

**`markCharacterIntroduced(uid, novelId)`**
Sets `has_introduced_self = true`. Called from `orchestrationService` when a character's name appears in a `[CharacterName]:` bubble in AI output.

Other functions: `getCharactersByNovel(novelId)`, `getCharacterByUid(uid, novelId)`, `updateCharacter(id, data)`, `updateCharacterLocation(uid, novelId, location)`, `updateCharacterMetadata(uid, novelId, updates)`, `getRelationships(novelId)`, `updateRelationship(novelId, uidA, uidB, type, value, description?)`.

---

### `src/database/chapterDB.ts`
`addChapter(data)`, `updateChapter(id, data)`, `getChapterByNumber(novelId, timelineId, n)`, `getLastChapter(novelId, timelineId)`.

### `src/database/sceneDB.ts`
`addScene(data)`, `getLastScenes(novelId, timelineId, count)`. The `getLastScenes` function is used to build HuggingFace context (last 3 scenes, up to 200 chars each). Grok gets the last 20 (up to 800 chars each) via `grokContextBuilder`.

### `src/database/memoryDB.ts`
`addMemory(data)`, `getTopMemories(novelId, timelineId, limit)` (sorted by importance_score descending), `archiveOldMemories(novelId, timelineId, maxCount)` (evicts oldest when count > maxCount).

### `src/database/progressionDB.ts`
`createProgression(data)`, `getProgression(novelId, characterUid)`, `updateProgression(id, data)`, `addSkill(data)`, `getSkills(novelId, characterUid)`.

### `src/database/inventoryDB.ts`
`initInventory(novelId, characterUid)`, `addItem(novelId, characterUid, item, qty)`, `removeItem(novelId, characterUid, item, qty)`, `getInventory(novelId, characterUid)`.

---

## 6. Service Layer

### `src/services/modelService.ts` — AI Provider Abstraction

A singleton class (`modelService`) that abstracts all AI provider differences behind a single interface. All state stored in `localStorage`.

**Provider configurations:**

| Provider | Model | Base URL | Auth |
|---|---|---|---|
| HuggingFace | User-selected | `router.huggingface.co/v1` | Bearer HF token |
| Grok | `grok-3-fast` | `api.x.ai/v1` | `VITE_GROK_API_KEY` env var |
| Gemini | `gemini-2.0-flash` | `generativelanguage.googleapis.com/v1beta/openai` | Bearer key from localStorage |
| OpenAI | `gpt-4o-mini` | `api.openai.com/v1` | Bearer key from localStorage |
| Claude | `claude-3-5-haiku-20241022` | `api.anthropic.com/v1` | `x-api-key` header (special) |
| DeepSeek | `deepseek-chat` | `api.deepseek.com/v1` | Bearer key from localStorage |

**Key methods:**
- `generateStream(systemPrompt, userPrompt, options)` — async generator, yields tokens as they arrive via SSE. Routes to the correct private stream method based on current provider.
- `generateText(systemPrompt, userPrompt, options)` — non-streaming, returns full text. Used for chapter titles, summaries, skill generation.
- `getProvider()` — reads from `localStorage('ai_provider')`
- `isProviderReady()` — returns true if the current provider has all required credentials
- `addListener(fn)` / `notifyListeners()` — pub/sub for React context to re-render on provider change

**Streaming mechanism:**
All providers except Claude use `_openAICompatStream()`, which POSTs to `/chat/completions` with `stream: true` and reads the SSE response via `_readSSEStream()`. Claude uses a separate `_claudeStream()` that handles Anthropic's different SSE format (`content_block_delta` events instead of OpenAI-style `choices[0].delta.content`). Gemini and OpenAI both have model fallback logic in case the primary model returns 404.

Large-context providers are detected by:
```typescript
const isLargeContextProvider = () => {
  const p = modelService.getProvider();
  return p === 'grok' || p === 'gemini' || p === 'openai' || p === 'claude';
};
```
When `isLargeContextProvider()` is true, `buildFullGrokContext()` is used and `maxTokens` is 2000. When false (HuggingFace), curated context is used and `maxTokens` defaults to 600.

---

### `src/services/presetManager.ts` — Preset Loader and Stacker

A singleton class (`presetManager`) that loads all preset `.ts` files at startup using Vite's `import.meta.glob`.

**Loading:** On first call to `loadAll()`, it reads every file matching `../presets/**/*.ts`, extracts the default export (a string), and stores it in `this.presets[filename_without_extension]`. This means `scene_awareness_engine.ts` is accessible as `this.presets['scene_awareness_engine']`.

**`getGenreSystemPrompt(genre: string): string`**

This is the most important method. Called before every scene generation. Assembles the complete system prompt by stacking presets in mandatory order:

```typescript
const basePresets = [
  'base_narrator',                    // Position 1
  'messenger_bubble_ui',              // Position 2
  'scene_awareness_engine',           // Position 3 ← NEW
  'world_state_persistence',          // Position 4
  'character_introduction_protocol',  // Position 5
  'character_metadata_expansion',     // Position 6
  'leveling_system',                  // Position 7
  'mc_traits_system',                 // Position 8
  `${genre}_genre`,                   // Position 9 (dynamic)
  'story_seed_integration',           // Position 10
  'story_opening_rules',              // Position 11
  'starting_location',                // Position 12
  'chapter_system',                   // Position 13
];
if (isGrok) basePresets.push('grok_content_policy');
```

Presets are joined with `'\n---\n'` separators to create one large system prompt string.

**Other methods:**
- `getPilotDecisionPrompt()` — returns `pilot_autopilot_decision` preset alone
- `getAskEdenPrompt()` — stacks `ask_eden_core` + `ask_eden_system_explainer`
- `getChapterGenerationPrompt()` — stacks `chapter_generation` + `chapter_summary`
- `getSkillGenerationPrompt(genre)` — stacks `ai_skill_generation` + `{genre}_progression` + `leveling_system`

---

### `src/services/worldStateService.ts` — World State Manager

Manages the `WorldStateData` typed object, which lives inside `world_state.state_json` in IndexedDB.

**`WorldStateData` interface — complete field list:**

```typescript
interface WorldStateData {
  genre: string;
  active_novel_id: number;
  active_timeline_id: string;
  current_chapter: number;
  current_scene: number;
  scene_count_since_chapter: number;
  current_location: string;
  current_arc: string;
  time_of_day: string;              // 'morning' | 'afternoon' | 'evening' | 'night'
  day_number: number;
  weather: string;
  allowed_fields: string[];
  forbidden_fields: string[];
  enabled_systems: string[];
  established_locations: string[];
  active_factions: string[];
  world_events: string[];           // Rolling last-20 world events
  emotional_state: string;
  narrative_pacing: string;
  pilot_mode_active: boolean;
  progression_state: {
    current_level: number;
    current_rank: string;
    unspent_points: number;
    active_path: string;
    stats: Record<string, number>;
  };
  active_character_uids: string[];
  sceneCountAtLocation: number;     // ← NEW: consecutive scenes at current_location
  tensionLevel: string;             // ← NEW: 'low' | 'medium' | 'high' | 'critical'
  mcIsReborn: boolean;              // ← NEW: true = Stranger Protocol active
}
```

**Functions:**
- `loadWorldState(novelId)` — reads and JSON-parses `state_json`
- `saveWorldState(novelId, state)` — serializes and writes `state_json`
- `updateWorldStateFields(novelId, updates)` — load → merge partial → save
- `incrementScene(novelId)` — increments `current_scene` and `scene_count_since_chapter`
- `incrementSceneCountAtLocation(novelId, currentLocation): Promise<number>` ← **NEW**
  - If `ws.current_location !== currentLocation`: sets `sceneCountAtLocation = 1`, updates location
  - If same location: increments `sceneCountAtLocation`
  - Saves to DB and returns the new count
- `addWorldEvent(novelId, event)` — appends to `world_events`, keeps last 20
- `buildContextSummary(ws)` — builds a 8-line text block for HuggingFace context prompts

---

### `src/services/orchestrationService.ts` — The Brain

The central generation pipeline. Every player action passes through `generateNextScene()`. This is the longest and most critical file in the codebase.

**`generateNextScene(novelId, timelineId, mcUid, mcName, genre, userAction, callbacks, maxTokens, temperature, offTopicCount)`**

Step-by-step execution:

**Step 1 — Load data:**
```typescript
const novel = await loadNovel(novelId);
const ws = await loadWorldState(novelId);
const characters = await getCharactersByNovel(novelId);
```

**Step 2 — Hook analysis:**
`analyzeHook(storySeed, mcName)` — checks if the story seed describes a regression/rebirth scenario. Produces an `openingBlock` injected into the first scene prompt to ensure the story starts correctly (before disaster, not during it).

**Step 3 — Build context block:**
- Large-context providers: `buildFullGrokContext(novelId, timelineId)` — full story history
- HuggingFace: last 3 scenes + top 10 memories + 8-char NPC list

**Step 4 — Find unintroduced characters:**
```typescript
const unintroPcs = characters
  .filter(c => c.role !== 'protagonist' && !c.has_introduced_self && c.status === 'alive')
  .slice(0, 2);
const introNudge = unintroPcs.length > 0
  ? `\nCHARACTER INTRO NEEDED: ${unintroPcs.map(c => c.display_name).join(' and ')} hasn't introduced themselves yet.`
  : '';
```

**Step 5 — Determine MC knowledge state:**
```typescript
const mcKnowledgeState = (genre === 'isekai' || ws.mcIsReborn)
  ? 'stranger-to-world'
  : 'familiar-world';
```

**Step 6 — Build Scene Awareness Context block (NEW):**
```typescript
const sceneAwarenessContext = [
  `=== SCENE AWARENESS CONTEXT ===`,
  `Current location: ${ws.current_location || 'unknown'}`,
  `Current time: ${ws.time_of_day || 'unknown'}`,
  `Scene count at this location: ${ws.sceneCountAtLocation || 0}`,
  `Characters physically present: ${characters.filter(...).map(c => c.display_name).join(', ') || 'none'}`,
  `MC knowledge state: ${mcKnowledgeState}`,
  `Unintroduced characters present: ${unintroPcs.map(c => c.display_name).join(', ') || 'none'}`,
  `Active tension level: ${ws.tensionLevel || 'low'}`,
  `=== END SCENE AWARENESS CONTEXT ===`,
].join('\n');
```

**Step 7 — Assemble the full user prompt:**
The user prompt is assembled from these parts, in this order:
1. `timelineConstraint` — regression timeline warning (if applicable)
2. `locationBlock` — starting location anchor
3. `genreIntegrity` — genre core elements reminder
4. `driftBlock` — drift recovery override (if offTopicCount ≥ 5)
5. MC identity line (never generate their dialogue)
6. `contextBlock + introNudge` — full story context
7. `sceneAwarenessContext` ← **NEW: injected here**
8. `PLAYER ACTION: "${userAction}"`
9. Scene writing instructions
10. Choice format template

**Step 8 — Get system prompt and stream:**
```typescript
const systemPrompt = presetManager.getGenreSystemPrompt(genre);
const stream = modelService.generateStream(systemPrompt, userPrompt, { maxTokens, temperature });
for await (const token of stream) {
  fullText += token;
  callbacks.onToken(token);   // → StoryScreen updates streamingText (live preview bar)
}
```

**Step 9 — Fallback choices:**
If AI output contains no `/choice/` lines, three generic fallback choices are injected.

**Step 10 — Parse tags:**
```typescript
const parsed = parseNarrativeTags(fullText);
callbacks.onTagsParsed(parsed);
```

**Step 11 — Update scene counts:**
```typescript
await incrementScene(novelId);
await incrementSceneCountAtLocation(novelId, parsed.locationChange || ws.current_location);  // ← NEW
await recordMemory(novelId, timelineId, parsed.cleanText.slice(0, 300), 5, [genre, ws.current_arc]);
```

**Step 12 — Process all tag events:**
- `parsed.locationChange` → `updateWorldStateFields({ current_location })`
- `parsed.worldEvents` → `addWorldEvent()` for each
- Speaker names (`[Name]:` pattern) → `markCharacterIntroduced()` for each non-MC speaker whose `has_introduced_self` is false ← **NEW**
- `parsed.newCharacters` → `createCharacter()` with `has_introduced_self: false` ← **NEW**
- Auto-detected speakers (from `parseBubbles` + `extractSpeakerNames`) → `createCharacter()` for any unknown speakers
- `parsed.inventoryAdds/Removes` → `addItem()` / `removeItem()`
- `parsed.characterDeaths` → `updateCharacter({ status: 'dead' })`
- `parsed.relationshipUpdates` → `updateRelationship()`
- `parsed.levelUp` → `triggerLevelUp()` → `callbacks.onLevelUp()`
- `parsed.skillUnlocks` → `callbacks.onSkillUnlock()`
- `parsed.chapterEnd` → `closeChapterAndBeginNext()` → `callbacks.onChapterEnd()`
- `parsed.pilotPause` → `callbacks.onPilotPause()`

**`generateNovelOpening()`** — called once for the first scene of a new novel. Uses `presetManager.getGenreSystemPrompt()` with a slightly different user prompt that includes MC traits, starting location, and the hook analysis block. Does not call `incrementSceneCountAtLocation()` since it's the opening. Also parses `/new_char:` tags and creates the initial NPC cast.

**`isMCSpeaker(speaker, mcName)`** — utility to check if a parsed `[Name]:` bubble belongs to the MC. Checks both the full name and individual name parts to handle edge cases like "Kai" matching "Kai Blackwood".

**Drift detection helper functions (built into orchestrationService):**
- `buildDriftRecoveryPrompt(genre, storySeed, driftCount)` — injected when `offTopicCount >= 5`
- `buildGenreIntegrityBlock(genre)` — injected into every prompt, lists the genre's 5 core elements
- `getGenreCoreElements(genre)` — returns the core element string for all 20 genres

---

### `src/services/novelService.ts`

High-level story management. Called from `GenrePickerScreen` to start a novel.

**`startNewNovel(input)`**
1. `createNovel(...)` → initializes DB (novel + timeline + world_state with mcIsReborn detection)
2. `createCharacter(...)` → creates the MC with `role: 'protagonist'`, `has_introduced_self: true`
3. `initInventory(novelId, mcChar.internal_uid)` → creates empty inventory row
4. `initPlayerProgression(novelId, mcChar.internal_uid, genre, startingSkills)` → creates progression row with starting skills applied
5. `addChapter(...)` → creates Chapter 1 "Prologue" record
6. Returns `{ novelId, mcUid, timelineId: 'main' }`

Other functions: `listNovels()`, `loadNovel(novelId)` (also updates `last_played_at`), `removeNovel(novelId)`, `incrementActionCount(novelId)`, `resetActionCount(novelId)`.

---

### `src/services/grokContextBuilder.ts` — Full Context Builder

`buildFullGrokContext(novelId, timelineId)` — queries all 9 tables in parallel via `Promise.all`:

```typescript
const [chapters, characters, worldStateRow, relationships, memories, progressions, skills, inventories, scenes] = await Promise.all([...]);
```

Assembles them into labeled sections:
1. `=== WORLD STATE ===` — pretty-printed JSON
2. `=== ALL CHARACTERS (N) ===` — name, role, status, gender, metadata
3. `=== RELATIONSHIPS ===` — uid pairs with type and numeric value
4. `=== PROGRESSION ===` — level, rank, path, stats
5. `=== SKILLS (N) ===` — active/inactive, name, rarity, description
6. `=== INVENTORY ===` — currency and items per character
7. `=== ALL MEMORIES (N) ===` — sorted by importance score descending
8. `=== ALL CHAPTERS (N) ===` — chapter number, title, summary in order
9. `=== RECENT SCENES (last N) ===` — last 20 scenes, up to 800 chars each

This context block can be 50,000+ tokens for mature stories. The large-context providers (Grok 131K, Gemini 1M, GPT-4o 128K, Claude 200K) can handle it. HuggingFace cannot — it gets the curated 3-scene + memory version.

---

### `src/services/memoryService.ts` — Memory Compression

**`recordMemory(novelId, timelineId, content, importanceScore, tags)`**
Called after every scene with the first 300 characters of clean output. Tags: `[genre, currentArc]`. Importance score defaults to 5. After adding, `archiveOldMemories()` runs to cap at 30 per novel per timeline.

**`buildMemoryContext(novelId, timelineId)`**
Fetches top 10 memories (by importance score), formats them as `[Memory] content` lines. Used in HuggingFace context building.

---

### `src/services/chapterService.ts` — Chapter Management

**`generateChapterTitle(novelId, timelineId)`**
Calls `modelService.generateText()` with `presetManager.getChapterGenerationPrompt()`. User prompt includes genre, arc, location, scene count. Returns a 1–6 word title string.

**`generateChapterSummary(novelId, timelineId)`**
Calls `modelService.generateText()` with the same prompt. Includes memory context. Returns 2–3 sentences.

**`closeChapterAndBeginNext(novelId, timelineId)`**
1. Generates title and summary (two AI calls)
2. Takes character and world snapshots
3. Updates (or creates) the closing chapter record with title, summary, and snapshots
4. Creates the next chapter record as "Chapter N — In progress..."
5. Returns `{ closedChapterId, newChapterId }`

Triggered by: `parsed.chapterEnd === true` from `orchestrationService`, or when `action_count` exceeds 20 in `StoryScreen`.

---

### `src/services/progressionService.ts` — Leveling & Skill System

**`initPlayerProgression(novelId, characterUid, genre, startingSkills)`**
Creates the initial `ProgressionData` record with:
- Level 1
- Rank: `getRankForLevel(1, genre)` (e.g., "Qi Condensation" for cultivation)
- Stats: all genre stat keys initialized to 0, then starting skill allocations applied (×2 multiplier)
- Unspent points: 0

**`getRankForLevel(level, genre)`**
Looks up `RANK_NAMES[genre]` (or `RANK_NAMES.default` if genre not in the map). Rank advances every 3 levels: `index = Math.floor((level - 1) / 3)`.

**`triggerLevelUp(novelId, characterUid, genre): Promise<LevelUpResult>`**
1. Reads current progression
2. Increments level, recalculates rank
3. Adds random stat gains to all genre stats (1 to `floor(level/5)+1` per stat)
4. Adds 3 unspent points
5. Queries AI for a new skill using `getSkillGenerationPrompt()` — parses `NAME:`, `DESC:`, `RARITY:`, `EVOLVE:` fields from the response
6. Saves the new skill to `skill_registry`
7. Updates progression record
8. Returns `LevelUpResult` with all the data to populate the `LevelUpOverlay`

**`spendStatPoints(novelId, characterUid, allocations)`**
Applies manual stat point allocations from the Level Up overlay UI.

**`applyBonusChoice(novelId, characterUid, bonusLabel, genre)`**
Applies a genre bonus choice (e.g., "Increase Combat") by keyword-matching the label to a stat key and adding +3.

---

### `src/services/pilotService.ts`

When Pilot Mode is active, before each scene generates, `pilotService` sends the current choices and story context to the AI and asks it to pick one. The decision is informed by:
- The MC's traits (personality, risk tolerance, altruism)
- The current emotional state and tension level from world state
- The genre's dramatic conventions
- Whether any choice is a "pivot moment" (betrayal, death, irreversible decision)

If the AI flags a pivot moment, it returns a `pilotPause` result instead of a choice. The story screen shows the pause banner and re-enables player input.

---

### `src/services/askEdenService.ts`

Handles queries to the Ask Eden panel. Assembles a context block from world state, top memories, character list, and recent scenes. Uses `presetManager.getAskEdenPrompt()` as the system prompt. Calls `modelService.generateText()` (non-streaming). The AI is instructed to answer as the story's narrator with full knowledge of story events, not as a generic assistant.

---

### `src/services/portraitService.ts`

`assignPortrait(novelId, uid, name, gender, role, genre)` — attempts to find a portrait image for a character by:
1. Looking in `/public/portraits/{genre}/{role}/` for any image file
2. Falling back to `/public/portraits/{genre}/{gender}/`
3. Falling back to `/public/portraits/{genre}/npcs/`
4. If no image found, returns a `{ type: 'initials' }` result that triggers the colored initials avatar

Results are cached in memory (cleared on novel change via `clearPortraitCache()`).

---

## 7. The Preset System

All preset files live in `src/presets/*.ts` and export a single `default string`. They are loaded at startup by `presetManager.loadAll()` using `import.meta.glob('../presets/**/*.ts', { eager: true })`.

### Mandatory Stack Order

When `presetManager.getGenreSystemPrompt(genre)` is called, these presets are concatenated in this exact order, separated by `\n---\n`:

```
1.  base_narrator.ts                   Core rules, MC protection, choice mandates, narrative quality
2.  messenger_bubble_ui.ts             Bubble formatting rules, [Speaker]: "dialogue" format
3.  scene_awareness_engine.ts          Scene progression, NPC intro protocol, choice rules ← NEW
4.  world_state_persistence.ts         How to read and reference world state
5.  character_introduction_protocol.ts Mandatory 4-step intro sequence, stranger protocol ← REWRITTEN
6.  character_metadata_expansion.ts    Character depth, personality evolution, backstory rules
7.  leveling_system.ts                 When to emit /level_up:true/, progression integration
8.  mc_traits_system.ts                How MC traits (personality, attitude, risk) affect narration
9.  {genre}_genre.ts                   Genre world rules, NPC archetypes, progression enforcement ← UPDATED
10. story_seed_integration.ts          How to honor and incorporate the player's story hook
11. story_opening_rules.ts             Rules for the novel's very first scene
12. starting_location.ts               How to anchor to the player's chosen starting location
13. chapter_system.ts                  When and how to open/close chapters
    grok_content_policy.ts             (Grok provider only) — appended when provider === 'grok'
    pilot_autopilot_decision.ts        (Pilot Mode only) — used separately, not in main stack
```

### Individual Preset Documentation

**`base_narrator.ts`** (UPDATED)
The foundation of all narration rules. Contains:
- Core rules 1–10: bubble format, MC silence, character voices, no recap, no meta-commentary
- MC protection triple rule: never write `[MCName]: "dialogue"`, never make MC decisions, only 3rd-person physical narration of MC is allowed
- Narrative pacing guide: establishing (4–6 bubbles), action (6–10), emotional (4–8), decision (end with choices)
- Multi-character dialogue example showing concurrent reactions
- Tone reference: Solo Leveling, Tower of God, Attack on Titan, Overlord
- **ADDED: Choice Generation Rules** — never repeat, never generic triad, specific to scene, at least one advances story, 4–12 words, first-person phrasing
- **ADDED: Narrative Quality Rules** — sensory opening, beat ending, subtext, dry fatalistic narrator, 120-word minimum, 200–350 target, `/italic/` inner monologue at least once per scene

**`messenger_bubble_ui.ts`**
Defines exactly how to format the chat bubble output. `[Speaker]: "dialogue"` for all NPC speech. Bare prose for narrator. `/choice/` lines always last.

**`scene_awareness_engine.ts`** (NEW — added in Scene Awareness Engine update)
The most complex preset. 9 sections:

- **Section 1 — Story Progression:** The 3-Scene Rule (must transition after 3 same-location scenes), Location Change Protocol (`/location_change:Name/`), Time Passage Protocol, **Choice Momentum Rule** (at least one choice per scene must exit the scene). Includes 12 genre-specific exit examples.

- **Section 2 — NPC Awareness:** Unknown Character Rule (describe before naming, reveal naturally, emit tag, include who-are-you choice), Reborn/Isekai/Amnesiac Rule (every character is a stranger), Returning Character Rule (brief visual anchor).

- **Section 3 — Contextual Choice Generation:** Who Are You Choice (mandatory trigger conditions: first appearance + no prior relationship + not yet introduced). 11 genre-variant phrasings (formal, casual, suspicious, isekai, cultivation, zombie, horror, reborn, mafia, military, vampire). Environment-Aware Choices (only what physically exists in scene). MC Knowledge-State Awareness (stranger-to-world vs familiar-world vs crisis).

- **Section 4 — Scene State Tracking:** Mental checklist (LOCATION, TIME, PRESENT, MC STATE, SCENE COUNT, UNKNOWNS, TENSION) the AI must confirm before generating output.

- **Section 5 — Choice Variety Forbidden Patterns:** Forbidden from repeating same list. Forbidden from attack/talk/wait triad. Five bad→good specific examples.

- **Section 6 — Story Quality:** Dialogue quality (distinct speech, subtext, 2–6 NPC lines), Narration quality (sensory opening, consequence description, dry narrator, beat ending), Scene length (120 min, 200–350 target, 40/40/20 balance), Inner monologue rules (`/italic/` minimum once), Atmosphere and tension rules (escalation, foreshadowing, emotional aftermath).

- **Section 7 — Genre Progression Triggers:** Per-genre mandatory events within a chapter: school (must leave campus), isekai (must learn world rules), zombie (must relocate), cultivation (cultivation moment every 4–5 scenes), romance (every chapter must advance the bond), horror (environment must change), military (must include tactical moment), superpower (power must show cost), mafia (hierarchy always felt), cyberpunk (megacorp presence always felt).

- **Section 8 — Tag Emission:** Proactive rules for when to fire each tag: `/location_change:`, `/world_event:`, `/new_char:`, `/relationship_update:`, `/time_skip:`.

- **Section 9 — Narrator Self-Audit:** 12-item checklist the AI must pass before outputting. If any fails, rewrite that section. Items: story moved forward, new characters introduced, choices specific to scene, one choice exits scene, narrator reflects MC knowledge, choices physically possible, who-are-you if needed, all tags emitted, 120+ words, sensory opening, beat ending, NPC dialogue specific.

**`world_state_persistence.ts`**
Instructs the AI how to interpret and reference the world state block injected into every prompt. What locations mean, how to reference established facts, how to flag contradictions.

**`character_introduction_protocol.ts`** (REWRITTEN — complete replacement)
Now contains 6 mandatory hard rules:
- Step 1: Physical description (min 2 sentences: build, clothing, one distinctive feature, feeling they project)
- Step 2: Name revealed naturally (never "His name was X" — through dialogue, insignia, or self-statement)
- Step 3: Emit `/new_char:Name|gender|role/` at end of scene
- Step 4: Generate who-are-you `/choice/` option
- Mandatory Stranger Protocol: every character is a stranger if MC is reborn/new-world/no-prior-knowledge
- Mandatory No Silent Appearances: presence must be acknowledged within 3 exchanges
- Genre tone guide: 9 genre-specific introduction tones
- Family/Past Character Protocol: use relationship prefix tags (`[DAD]`, `[MOM]`, `[BEST FRIEND]`, etc.), handle rebirth confusion reaction

**`character_metadata_expansion.ts`**
Rules for building character depth over time: speech patterns evolving, backstory hints, motivation reveals, trauma markers, personality contradictions.

**`leveling_system.ts`**
When to fire `/level_up:true/`: after hard-fought victories, after crucial revelations, after personal sacrifices. Not randomly. Defines the emotional weight of leveling. Instructs how to frame the in-story "power awakening" moment.

**`mc_traits_system.ts`**
If the player set MC traits (personality, attitude, risk tolerance, altruism), this preset instructs the AI to have those traits color how the narrator describes MC reactions, what the inner monologue sounds like, and what kinds of choices feel natural to offer this specific character.

**`{genre}_genre.ts` (all 20, UPDATED)**
Each genre file defines: the world's tone and atmosphere, recurring NPC archetypes and their speech styles, genre-specific vocabulary and mechanics, rules for what is and isn't realistic in this world, when to escalate and when to breathe.

**Each genre file now ends with a `=== [GENRE] PROGRESSION ENFORCEMENT ===` block containing:**
1. **Location Lock Prevention** — after 3 consecutive scenes at same location, next scene MUST include a physical transition using `/location_change:Name/`
2. **NPC Stranger Rule** — any character the MC hasn't spoken to or been introduced to is a STRANGER; narrator must not imply familiarity
3. **Choice Specificity** — every choice must feel specific to this genre; a zombie choice cannot sound like a school choice

**`{genre}_progression.ts` (12 genres)**
Defines the power fantasy: rank names, cultivation stages, ability tiers, what advancing means in the genre's world. Used only by `getSkillGenerationPrompt()` for AI skill generation, not in the main story stack.

**`pilot_autopilot_decision.ts`**
Used only when Pilot Mode is active. Rules for how the AI should evaluate and select a choice based on character personality, narrative momentum, and whether the moment is a pivot point requiring human input.

**`ask_eden_core.ts` + `ask_eden_system_explainer.ts`**
Used only for Ask Eden panel queries. Instructs the AI to answer in-character as the story's narrator, to reference actual story data (not hallucinate), to give useful answers about lore, characters, and past events.

**`chapter_generation.ts` + `chapter_summary.ts`**
Used only for chapter close events. `chapter_generation.ts` rules for creating a short evocative title (max 6 words, output only the title). `chapter_summary.ts` rules for creating a 2–3 sentence narrative summary that captures the chapter's emotional arc.

**`ai_skill_generation.ts`**
Used only for level-up skill generation. Defines the output format (NAME:, DESC:, EFFECT:, RARITY:, EVOLVE:, PATH:) and rules for what makes a good genre-appropriate skill.

**`grok_content_policy.ts`**
Appended to the system prompt when provider is Grok. Contains Grok-specific content handling and safety rules for the narrative context.

---

## 8. The Tag Parser

### `src/parsers/tagParser.ts`

This file contains three exported functions that together handle all AI output processing.

**`parseNarrativeTags(text: string): TagParseResult`**

Phase 1 — Choice extraction:
Scans every line for `/choice/` prefix. Parses optional roleplay text via `-> "text"` suffix:
```
/choice/ Step forward and block the door -> "Move. Now."
```
Produces `choiceOptions: [{ label: "Step forward and block the door", roleplayText: "Move. Now." }]`. The roleplay text is shown as the player's bubble when that choice is selected (without an AI call). The label is sent to the AI as the player action.

Phase 2 — Structured tag extraction:
Matches all `/type:value/` patterns using `TAG_RE = /\/([a-zA-Z_]+)(?::([^\/\n]*))?\//g`.

Full tag handler table:

| Tag pattern | Parsed into | Effect |
|---|---|---|
| `/location:X/` or `/location_change:X/` | `result.locationChange = X` | Location change event |
| `/level_up:true/` | `result.levelUp = true` | Trigger level-up overlay |
| `/chapter_end:true/` | `result.chapterEnd = true` | Close chapter |
| `/arc_complete/` | `result.chapterEnd = true` | Alias for chapter end |
| `/new_character:Name\|gender\|role\|desc/` | `result.newCharacters.push(...)` | Register new character |
| `/character_update:uid:field:val/` | `result.characterUpdates.push(...)` | Update character field |
| `/skill_unlock:Name/` | `result.skillUnlocks.push(Name)` | Unlock skill |
| `/inventory_add:Item:qty/` | `result.inventoryAdds.push(...)` | Add item |
| `/inventory_remove:Item:qty/` | `result.inventoryRemoves.push(...)` | Remove item |
| `/character_death:uid/` | `result.characterDeaths.push(uid)` | Mark character dead |
| `/relationship_update:uid:type:val/` | `result.relationshipUpdates.push(...)` | Update affinity |
| `/world_event:desc/` | `result.worldEvents.push(desc)` | Log world event |
| `/pilot_pause:reason/` | `result.pilotPause = reason` | Pause Pilot Mode |
| `/time_skip:desc/` | `result.timeSkip = desc` | Record time skip |

Phase 3 — Clean text production:
All tags are aggressively stripped from the display text. Additionally handles formatting tags: `/italic/` and `/enditalic/` → `_` (markdown italics), `/bold/` → `**`, and strips: `/whisper/`, `/thought/`, `/scene_start/`, `/scene_end/`, `/speaker_uid:/`, `/emotion:/`, `/pause:N/`, `/faction_change:/`, `/path:/`. Collapses triple newlines, trims.

**`parseBubbles(text: string)`**
Splits clean text into an array of bubble objects. Two detection patterns:
1. `[Speaker]: "dialogue"` → character bubble with `speaker` set
2. `Name: "dialogue"` (without brackets) → character bubble
3. Everything else → narrator bubble (`isNarrator: true`)

**`extractSpeakerNames(bubbles, mcName)`**
Finds all unique speakers in a parsed bubble array that are NOT the MC. Used for auto-creating character records for any NPC who speaks in a scene but wasn't declared via `/new_char:` tag. Returns a `string[]` of names.

---

## 9. Screens

### `src/screens/ProviderSelectionScreen.tsx`
First screen after launch. Shows 6 AI provider cards. On selection, calls `modelService.setProvider()`. Routes to the appropriate setup screen or directly to `/novels`.

### `src/screens/HFTokenScreen.tsx`
Collects and tests the HuggingFace API token. On success, calls `modelService.saveToken()` and navigates to `/model-selection`.

### `src/screens/ApiKeySetupScreen.tsx`
Collects API keys for Gemini, OpenAI, Claude, or DeepSeek. Calls `modelService.saveApiKey(provider, key)`.

### `src/screens/ModelSelectionScreen.tsx`
Shows `RECOMMENDED_MODELS` (8 curated models) and optionally fetches the full model list from HuggingFace Router. Calls `modelService.selectModel(id)`.

### `src/screens/NovelSelectionScreen.tsx`
Lists all novels via `listNovels()`. Each novel card shows title, genre badge, last played date, chapter count. Delete button calls `removeNovel()`. "Create New Story" navigates to `/genre-picker`.

### `src/screens/GenrePickerScreen.tsx`
4-step novel creation flow managed by `step` state:
1. **Genre** — 2-column grid of all 20 genres from `GENRES` constant
2. **Setup** — title, MC name, world name, starting location (dropdown from `GENRE_STARTING_LOCATIONS` or custom), story seed textarea
3. **Traits** — dropdowns for personality, attitude, risk tolerance, altruism from `MC_TRAITS`
4. **Skills** — allocate `INITIAL_SKILL_POINTS` across genre skill definitions from `GENRE_STARTING_SKILLS`

On final "Begin Story": calls `startNewNovel()`, dispatches `SET_NOVEL` to StoryContext, navigates to `/story/:novelId`.

The story seed entered here flows into `novelDB.ts` `createNovel()` where the **mcIsReborn keyword regex** runs to auto-detect stranger-world scenarios.

### `src/screens/StoryScreen.tsx`
The main story interface. The most complex screen. Key responsibilities:
- Renders the bubble list (scrollable chat area) using `MessageBubble`, `NarratorBubble`, `CharacterAvatar`
- Shows streaming preview bar at top (last 120 chars of `streamingText`)
- Shows `ChoiceButton` grid or `CustomActionInput` based on `interactionMode`
- Manages bottom nav (5 tabs: Characters, Status, Inventory, World, Ask Eden) → slides up respective panel
- Triggers `LevelUpOverlay` when `pendingLevelUp` is set
- Triggers `SkillTreeOverlay` from Status panel
- Handles player choice selection: adds player bubble to chat, calls `generateNextScene()`
- Handles Pilot Mode: auto-selects choice after 2s delay via `pilotService`
- Auto-chapter-close: when `actionCount >= 20`, calls `closeChapterAndBeginNext()`

### `src/screens/ChapterHistoryScreen.tsx`
Reads all chapters for the active novel. Displays chapter list with titles, summaries, and dates. Allows navigating to a chapter for read-only view.

### `src/screens/TimelineBranchScreen.tsx`
Shows all timelines as a visual branch tree. Each chapter dot on the main timeline has "Branch Here" / "Read Only" options. Branching calls the timeline creation logic, restores world state from the chapter's `world_snapshot_json`, and sets the new `active_timeline_id`.

### `src/screens/SettingsScreen.tsx`
Provider/token/model management. Allows switching providers, re-entering keys, selecting a different model.

---

## 10. Panels & Overlays

### `src/panels/CharacterPanel.tsx`
Slide-up bottom sheet. Reads characters from `getCharactersByNovel()`. Shows each character's avatar, name, role badge, status, and a relationship summary. Characters sorted by role (protagonist first, then by status).

### `src/panels/StatusPanel.tsx`
Shows the MC's current level, rank (`RankBadge`), all stats with values (`StatBar` per stat), unspent point count, and skill list (`SkillCard` per skill). Button to open `SkillTreeOverlay`. "Allocate Points" button opens the allocation UI (same as the Level Up overlay stat section but standalone).

### `src/panels/InventoryPanel.tsx`
Reads inventory from `getInventory()`. Shows currency with label, then item list with quantities.

### `src/panels/WorldPanel.tsx`
Reads world state via `loadWorldState()`. Shows all tracked fields: location, arc, time of day, weather, emotional state, recent world events list, active factions, established locations. Includes the new fields: `tensionLevel`, `sceneCountAtLocation`, `mcIsReborn` flag.

### `src/panels/AskEdenPanel.tsx`
Text input + submit. On submit, calls `askEdenService.query()`. Shows the AI's answer in a formatted card below. Maintains a history of Q&A pairs within the session.

### `src/overlays/LevelUpOverlay.tsx`
Full-screen cinematic overlay. Triggered by `pendingLevelUp` in StoryContext. Displays:
- Animated rank-up banner
- Old rank → new rank transition
- Stat gains (each shown with a bar animation)
- Unspent points counter
- New skill reveal (name, description, rarity glow)
- Stat allocation +/- buttons (calls `spendStatPoints()`)
- Genre bonus choices (calls `applyBonusChoice()`)
- Dismiss button (clears `pendingLevelUp`)

### `src/overlays/SkillTreeOverlay.tsx`
Full-screen skill tree. Skills grouped by `path_name` into columns. Each node shows: skill name, rarity color glow, lock/unlock state. Hidden nodes shown as blurred/locked. Pinch-to-zoom supported. Accessed from Status panel.

---

## 11. Components

### `src/components/chat/MessageBubble.tsx`
Renders a single NPC or player bubble. Left-aligned for NPCs (with avatar), right-aligned blue for player. Uses Framer Motion `motion.div` with `initial={{ opacity: 0, y: 10 }}` entry. Shows `bubbleColor` as left border accent. Renders markdown (`**bold**`, `_italic_`) in content.

### `src/components/chat/NarratorBubble.tsx`
Wide full-width italic prose card. No avatar. Slightly different background. Used for all `isNarrator: true` bubbles.

### `src/components/chat/CharacterAvatar.tsx`
Either renders a `<img>` from `portrait_path` or a colored initials circle. Color is derived from `bubble_color` or `PORTRAIT_COLORS[gender]`. Size variants: sm (24px), md (32px), lg (48px).

### `src/components/chat/TypingIndicator.tsx`
Three dots with staggered Framer Motion pulse animation. Shown as a bubble when `isTyping: true`.

### `src/components/choice/ChoiceButton.tsx`
Glowing animated button for each choice option. Uses `motion.button` with stagger delay based on index. Shows the choice label. On click, triggers scene generation with the choice label as `userAction` and optionally displays `roleplayText` as a player bubble before calling the AI.

### `src/components/choice/CustomActionInput.tsx`
Shown when no `/choice/` lines were generated. A text input + send button. On submit, the raw text becomes the `userAction`.

### `src/components/common/AnimatedPanel.tsx`
Reusable bottom sheet. Uses Framer Motion `AnimatePresence` + `motion.div` with `initial={{ y: '100%' }}` → `animate={{ y: 0 }}`. Spring physics. Backdrop overlay dismisses on click.

### `src/components/common/GenreBadge.tsx`
Pill badge with genre icon and name. Color from `GENRES[genre].color`. Used in NovelSelectionScreen cards.

### `src/components/common/ConnectionChip.tsx`
Small chip showing current AI provider and connection status (green dot = connected, red = error). Shown in the StoryScreen header.

---

## 12. Core Constants & Genre Data

### `src/core/constants.ts`
- `RECOMMENDED_MODELS` — 8 curated HuggingFace models with labels, speed, and quality ratings
- `GENRES` — array of 20 genre objects `{ id, name, icon, description, color }`
- `RANK_NAMES` — rank progression arrays for `default`, `cultivation`, `zombie`, `fantasy`, `superpower`
- `BUBBLE_COLORS` — 15 dark hex colors for NPC bubble assignment
- `PORTRAIT_COLORS` — color sets by gender for initials avatars

### `src/core/genreStats.ts`
- `GENRE_STATS` — `Record<string, string[]>` — stat key names per genre (e.g., cultivation: `['Qi Power', 'Spiritual Sense', 'Body Refinement', 'Soul Strength', 'Combat Power']`)
- `SKILL_FALLBACKS` — fallback skill names per genre, used when AI skill generation fails

### `src/core/genreSkillPaths.ts`
- `GENRE_SKILL_PATHS` — `Record<string, string[]>` — skill path names per genre (e.g., cultivation: `['Qi Path', 'Body Path', 'Soul Path', 'Sword Path', 'Formation Path']`)
- `BONUS_CHOICES_BY_GENRE` — bonus choice labels shown in Level Up overlay per genre

### `src/core/genreStartingSkills.ts`
- `GENRE_STARTING_SKILLS` — `Record<string, SkillDefinition[]>` — the allocatable skills shown in GenrePicker Step 4
- `MC_TRAITS` — `Record<keyof MCTraits, string[]>` — trait option values for each trait dimension
- `INITIAL_SKILL_POINTS` — total allocation points for starting skills
- `MAX_SKILL_VALUE` — max points in a single skill

### `src/core/genreStartingLocations.ts`
- `GENRE_STARTING_LOCATIONS` — `Record<string, string[]>` — preset location options for GenrePicker dropdown per genre

### `src/core/utils.ts`
- `generateId()` — generates a UUID v4-style string for `internal_uid` fields
- Date formatting utilities

---

## 13. Full Data Flow — Scene Generation

This traces the complete path from player clicking a choice to bubbles appearing on screen.

```
Player taps choice button (ChoiceButton.tsx)
  │
  ▼
StoryScreen.handleChoice(choiceLabel, roleplayText?)
  │
  ├── Adds player bubble to StoryContext (the spoken roleplay text or choice label)
  ├── dispatch SET_GENERATING(true)
  ├── dispatch INCREMENT_ACTION
  │
  ▼
generateNextScene(novelId, timelineId, mcUid, mcName, genre, userAction, callbacks)
  │  (src/services/orchestrationService.ts)
  │
  ├── loadNovel(novelId)                      → novelDB.ts → db.novels
  ├── loadWorldState(novelId)                 → novelDB.ts → db.world_state → JSON.parse
  ├── getCharactersByNovel(novelId)           → characterDB.ts → db.characters
  │
  ├── analyzeHook(storySeed, mcName)          → builds hook analysis object
  ├── buildTimelineConstraint(hook, mcName)   → builds regression constraint string
  │
  ├── [IF large-context provider]
  │   buildFullGrokContext(novelId, timelineId)  → grokContextBuilder.ts
  │     └── Promise.all([9 table queries])       → db.chapters, characters, world_state,
  │                                                 relationships, memories, progressions,
  │                                                 skills, inventories, scenes
  │
  ├── [IF HuggingFace]
  │   buildMemoryContext(novelId, timelineId)    → memoryDB.ts (top 10 memories)
  │   getLastScenes(novelId, timelineId, 3)      → sceneDB.ts
  │
  ├── Build unintroPcs (characters with has_introduced_self === false)
  ├── Determine mcKnowledgeState (stranger-to-world | familiar-world)
  │
  ├── Build sceneAwarenessContext block          ← NEW (7 fields from live world state)
  │
  ├── presetManager.getGenreSystemPrompt(genre) → presetManager.ts
  │   └── stackPresets([13 preset names])       → concatenates 13 preset strings
  │
  ├── Assemble userPrompt                        → 12-part string join
  │
  ├── modelService.generateStream(systemPrompt, userPrompt, options)
  │   └── [streams tokens]
  │         └── callbacks.onToken(token)
  │               └── StoryScreen: dispatch UPDATE_STREAMING(streamingText)
  │                   → live preview bar updates every token
  │
  ├── [AFTER stream ends]
  │   Inject fallback choices if none in output
  │
  ├── parseNarrativeTags(fullText)               → tagParser.ts
  │   ├── Extract /choice/ lines → choiceOptions
  │   ├── Extract all /tag:value/ events
  │   └── Strip all tags → cleanText
  │
  ├── callbacks.onTagsParsed(parsed)
  │   └── StoryScreen: parseBubbles(cleanText) → split into bubble array
  │         → dispatch ADD_BUBBLE for each bubble (staggered delay)
  │         → dispatch SET_INTERACTION('decision', choices) or ('cinematic')
  │
  ├── incrementScene(novelId)                    → worldStateService.ts
  ├── incrementSceneCountAtLocation(novelId, loc) → worldStateService.ts ← NEW
  ├── recordMemory(novelId, timelineId, ...)     → memoryService.ts → memoryDB.ts
  │
  ├── [If locationChange] updateWorldStateFields({ current_location })
  ├── [For each worldEvent] addWorldEvent(novelId, ev)
  │
  ├── [For each [Speaker]: match]                ← NEW
  │   markCharacterIntroduced(uid, novelId)      → characterDB.ts → has_introduced_self = true
  │
  ├── [For each newCharacter tag]                ← NEW
  │   createCharacter({ has_introduced_self: false })  → characterDB.ts
  │
  ├── [For auto-detected speakers]
  │   createCharacter({ has_introduced_self: true })  → characterDB.ts
  │
  ├── [inventoryAdds/Removes] addItem/removeItem → inventoryDB.ts
  ├── [characterDeaths] updateCharacter({ status: 'dead' }) → characterDB.ts
  ├── [relationshipUpdates] updateRelationship() → characterDB.ts
  │
  ├── [IF levelUp]
  │   triggerLevelUp(novelId, mcUid, genre)      → progressionService.ts
  │     ├── generateText(skillPrompt)            → modelService.ts → AI call
  │     ├── addSkill(...)                        → progressionDB.ts
  │     └── updateProgression(...)              → progressionDB.ts
  │   callbacks.onLevelUp(result)
  │   └── StoryScreen: dispatch SET_LEVEL_UP → LevelUpOverlay appears
  │
  ├── [IF chapterEnd]
  │   closeChapterAndBeginNext(novelId, timelineId) → chapterService.ts
  │     ├── generateChapterTitle()               → modelService.generateText()
  │     ├── generateChapterSummary()             → modelService.generateText()
  │     ├── updateChapter(...)                   → chapterDB.ts
  │     └── addChapter(...)                      → chapterDB.ts
  │   callbacks.onChapterEnd(newChapterId)
  │   └── StoryScreen: dispatch SET_CHAPTER(n+1), reset actionCount
  │
  └── [IF pilotPause]
      callbacks.onPilotPause(reason)
      └── StoryScreen: dispatch PILOT_PAUSE → banner appears, player retakes control

StoryScreen: dispatch SET_GENERATING(false)
Bubbles animate in with staggered entry (Framer Motion)
Choice buttons appear below the chat
```

---

## 14. New Systems Added

This section documents every change made during the Scene Awareness Engine implementation.

### New File: `src/presets/scene_awareness_engine.ts`
Created from scratch. 9 sections, ~335 lines. Loaded as position 3 in the mandatory preset stack. Full contents documented in Section 7 above.

### Modified File: `src/services/presetManager.ts`
`getGenreSystemPrompt()` now includes `'scene_awareness_engine'` at position 3 in the `basePresets` array, between `'messenger_bubble_ui'` and `'world_state_persistence'`.

### Modified File: `src/presets/character_introduction_protocol.ts`
Complete rewrite. Old file had basic introduction rules. New file has:
- Mandatory 4-step sequence (Steps 1–4)
- MANDATORY RULE — STRANGER PROTOCOL
- MANDATORY RULE — NO SILENT APPEARANCES
- Genre-specific introduction tone guide (9 genres)
- Family and Past Characters special protocol with prefix tag format

### Modified File: `src/presets/base_narrator.ts`
Appended two new rule blocks to the existing string:
- **CHOICE GENERATION RULES — MANDATORY ADDITIONS:** 6 rules (A–F)
- **NARRATIVE QUALITY RULES — MANDATORY:** 6 rules (A–F)

### Modified File: `src/services/worldStateService.ts`
- Added `sceneCountAtLocation: number` to `WorldStateData` interface
- Added `tensionLevel: string` to `WorldStateData` interface
- Added `mcIsReborn: boolean` to `WorldStateData` interface
- Added `incrementSceneCountAtLocation(novelId, currentLocation): Promise<number>` function — resets to 1 on location change, increments on same location, returns the new count

### Modified File: `src/database/novelDB.ts`
- `createNovel()` now runs the mcIsReborn keyword regex against `story_seed` and the genre check against `'isekai'`
- `defaultWorldState` now includes: `sceneCountAtLocation: 0`, `tensionLevel: 'low'`, `mcIsReborn` (auto-detected boolean)
- mcIsReborn keyword regex covers: `reborn`, `rebirth`, `past life`, `previous life`, `died`, `reincarn*`, `transmigrat*`, `regression`, `second chance`, `second life`, `another world`, `isekai`, `woke up in/as`, `returned to`, `transported to`

### Modified File: `src/services/orchestrationService.ts`
Three additions:

1. **Scene Awareness Context injection** — the 7-field `=== SCENE AWARENESS CONTEXT ===` block is assembled from live world state and injected into `userPrompt` between the context block and the `PLAYER ACTION:` line

2. **`incrementSceneCountAtLocation` call** — called immediately after `incrementScene()` with `parsed.locationChange || ws.current_location` as the location argument

3. **`markCharacterIntroduced` call on speaker detection** — after generation, all `[Name]:` patterns in fullText are matched; for each non-MC speaker whose `has_introduced_self` is false, `markCharacterIntroduced()` is called

### Modified Files: All 20 `{genre}_genre.ts` presets
Each file has a `=== [GENRE] PROGRESSION ENFORCEMENT ===` block appended at the end of the template literal containing:
- Location lock prevention rule (3 scenes → must use `/location_change:`)
- NPC stranger rule (unintroduced = stranger, narrator reflects MC ignorance)
- Choice specificity rule (choices must feel genre-specific)

---

## 15. Connection Map

How files call each other (key connections only):

```
App.tsx
  → context/ModelContext.tsx (wraps modelService)
  → context/StoryContext.tsx (useReducer state machine)
  → context/ProgressionContext.tsx (reads progressionDB)
  → screens/* (routes)

screens/GenrePickerScreen.tsx
  → services/novelService.ts → startNewNovel()
      → database/novelDB.ts → createNovel() [mcIsReborn detection]
      → database/characterDB.ts → createCharacter()
      → database/inventoryDB.ts → initInventory()
      → services/progressionService.ts → initPlayerProgression()
      → database/chapterDB.ts → addChapter()

screens/StoryScreen.tsx
  → services/orchestrationService.ts → generateNextScene()
      → services/modelService.ts → generateStream()
      → services/presetManager.ts → getGenreSystemPrompt()
          → src/presets/*.ts (all 13 in stack)
      → services/worldStateService.ts → loadWorldState(), incrementScene(), incrementSceneCountAtLocation() ← NEW
      → services/grokContextBuilder.ts → buildFullGrokContext() [large-context only]
      → services/memoryService.ts → buildMemoryContext(), recordMemory()
      → parsers/tagParser.ts → parseNarrativeTags(), parseBubbles(), extractSpeakerNames()
      → database/characterDB.ts → getCharactersByNovel(), createCharacter(), markCharacterIntroduced() ← NEW
      → database/novelDB.ts → getWorldState(), setWorldState()
      → database/sceneDB.ts → getLastScenes()
      → database/inventoryDB.ts → addItem(), removeItem()
      → services/chapterService.ts → closeChapterAndBeginNext()
          → services/modelService.ts → generateText() [2 calls: title + summary]
          → database/chapterDB.ts → updateChapter(), addChapter()
      → services/progressionService.ts → triggerLevelUp()
          → services/modelService.ts → generateText() [skill generation]
          → database/progressionDB.ts → updateProgression(), addSkill()

  → services/pilotService.ts [Pilot Mode only]
      → services/modelService.ts → generateText()

  → panels/AskEdenPanel.tsx
      → services/askEdenService.ts
          → services/modelService.ts → generateText()
          → services/presetManager.ts → getAskEdenPrompt()

database/db.ts
  ← imported by all database/*.ts files
  ← defines all TypeScript interfaces used throughout the codebase

services/presetManager.ts
  ← import.meta.glob loads all src/presets/*.ts at startup
  ← getGenreSystemPrompt() called by orchestrationService and generateNovelOpening()
  ← getAskEdenPrompt() called by askEdenService
  ← getChapterGenerationPrompt() called by chapterService
  ← getSkillGenerationPrompt() called by progressionService
```

---

*Last updated: Scene Awareness Engine implementation complete. TypeScript strict mode passes with zero errors.*

---

# Part III — Task #3: UI Redesign, Media & Systems

This part documents every file, folder, interface, and connection added or changed during Task #3 (UI Redesign, Media & Systems). It is written as a continuation of Part II and assumes familiarity with the full pre-Task-#3 architecture described there.

---

## Overview of What Changed in Task #3

Six new service files, one new component folder (eight files), three new `public/` directory conventions, and eleven new `localStorage` keys were added. The `StoryScreen` was substantially rewritten to wire all new systems together. Three setup screens received a full cinematic dark-anime visual redesign. Two existing service interfaces were extended. TypeScript passes with zero errors throughout.

### New Files Added

```
src/services/
├── audioService.ts               ← Web Audio wrapper: ambient, music, SFX with fade
├── audioOrchestrator.ts          ← Scene-context audio coordinator (genre + tension → tracks)
├── voiceAssignmentService.ts     ← Persistent Nova TTS voice assignment per character
├── predictiveEngine.ts           ← Background pre-generation cache with 5-min TTL
├── minigameService.ts            ← Keyword-trigger rules + MinigameResult interface
└── environmentImageService.ts   ← Genre+location → public/environments image lookup

src/components/
├── chat/
│   └── EnvironmentBubble.tsx    ← h-48 location image card, inserted on /location_change:
└── minigames/
    ├── MinigameWrapper.tsx       ← Switch-router: maps MinigameType → component
    ├── QTEMinigame.tsx           ← Real-time progress bar tap challenge
    ├── CombatMinigame.tsx        ← Rock-paper-scissors 3-move combat (attack/defend/skill)
    ├── DialogueMinigame.tsx      ← Scored multi-round NPC conversation
    ├── MemoryMinigame.tsx        ← Symbol pair-matching card game
    ├── NegotiationMinigame.tsx   ← Multi-round offer/counter-offer price negotiation
    ├── StealthMinigame.tsx       ← 5×5 grid stealth: reach exit before guard catches you
    └── ExamMinigame.tsx          ← Genre-specific multiple-choice knowledge check
```

### New Public/ Folder Conventions

These folders hold optional media assets. All paths are resolved at runtime; missing files gracefully fall back (no images shown, no audio played). None of these files are committed to the repo — they are placeholders for the operator to fill.

```
public/
├── audio/
│   ├── ambient/
│   │   └── <genre>_low.mp3       ← Low-tension ambient loop (e.g. fantasy_low.mp3)
│   │   └── <genre>_high.mp3      ← High-tension ambient loop (e.g. zombie_high.mp3)
│   ├── music/
│   │   ├── <genre>_combat.mp3    ← Combat music track
│   │   ├── <genre>_tension.mp3   ← Medium/high tension music
│   │   └── <genre>_calm.mp3      ← Default calm background music
│   └── sfx/
│       ├── combat_start.mp3      ← Played when hasCombat detected in scene text
│       └── level_up.mp3          ← Played when isLevelUp detected in scene text
└── environments/
    └── <genre>/
        └── <location_keyword>.png   ← Any image matching location keywords
```

**Audio filename convention:** Ambient tracks follow the exact pattern `<genre_slug>_low.mp3` / `<genre_slug>_high.mp3` where `genre_slug` equals the genre id string (e.g. `cultivation`, `zombie`, `romance`). No slug remapping occurs.

**Environment image lookup:** `environmentImageService` uses `import.meta.glob('/public/environments/**/*.{png,jpg,jpeg,webp}')`. It scores each candidate by counting how many space/dash-separated words from `locationName` appear in the file path. The highest-scoring match wins. If all scores are zero, a random candidate from the genre folder is returned.

---

## New localStorage Keys

Eleven new keys are read at runtime. All default to `true` (enabled) unless explicitly set to `'false'`.

| Key | Controls |
|---|---|
| `eden_ambient_enabled` | Whether ambient audio loop plays |
| `eden_music_enabled` | Whether music layer plays |
| `eden_sfx_enabled` | Whether SFX (combat_start, level_up) plays |
| `eden_char_voices_enabled` | Whether NPC bubbles are spoken via Nova TTS |
| `eden_narrator_voice_enabled` | Whether narrator bubbles are spoken via Nova TTS |
| `eden_predictive_enabled` | Whether the predictive engine pre-generates scenes |
| `eden_minigames_enabled` | Whether minigames can trigger |
| `eden_env_images_enabled` | Whether EnvironmentBubble inserts on location change |
| `eden_voice_<novelId>_<char_name>` | Persisted voice id for a character (one key per novel+character) |
| `eden_bubbles_<novelId>` | localStorage fallback for bubble persistence (pre-existing, retained) |
| `eden_choices_<novelId>` | Persisted choice→roleplayText map (pre-existing, retained) |

---

## 16. New Services — Task #3

### `src/services/audioService.ts`

A singleton `AudioService` class exported as `audioService`. Manages two independent `HTMLAudioElement` instances: one for ambient loops (`ambientEl`), one for music loops (`musicEl`). SFX are fire-and-forget single elements with no instance tracking.

**Constants:**
- `FADE_STEPS = 20`, `FADE_INTERVAL_MS = 50` — produces a 1-second crossfade
- Ambient target volume: `0.3`; music target volume: `0.5`; SFX volume: `0.6`

**`isEnabled(key)`** — reads `localStorage.getItem(key) !== 'false'`. All three method groups check their respective key before doing any work.

**`playAmbient(trackPath)`** — if `eden_ambient_enabled` is true: fades out any existing ambient element (awaits), creates a new `loop = true` element, fades it in to `0.3`.

**`stopAmbient()`** — fades out and nulls `ambientEl`.

**`playMusic(trackPath)`** — same pattern, target volume `0.5`, guarded by `eden_music_enabled`.

**`stopMusic()`** — fades out and nulls `musicEl`.

**`playSfx(trackPath)`** — creates a one-shot `Audio` element, sets volume to `0.6`, calls `.play()` with `.catch(() => {})`. No fade. Guarded by `eden_sfx_enabled`.

Both `play*` methods are fully `try/catch` wrapped — a missing audio file never throws to the caller.

---

### `src/services/audioOrchestrator.ts`

Stateless function module. Exports one function: `orchestrateScene(ctx: SceneContext)`.

**`SceneContext` interface:**
```typescript
interface SceneContext {
  genre: string;
  tensionLevel?: string;    // 'low' | 'medium' | 'high'
  locationName?: string;
  hasCombat?: boolean;
  isLevelUp?: boolean;
}
```

**`ambientForGenre(genre, tensionLevel)`** — builds path `/audio/ambient/<genre>_low.mp3` or `<genre>_high.mp3`. No slug remapping — the genre id is used directly.

**`musicForContext(ctx)`** — priority order:
1. `ctx.hasCombat` → `<genre>_combat.mp3`
2. `tensionLevel === 'high' | 'medium'` → `<genre>_tension.mp3`
3. Default → `<genre>_calm.mp3`

**`orchestrateScene(ctx)`** — calls `audioService.playAmbient()`, `audioService.playMusic()`, and conditionally `audioService.playSfx('/audio/sfx/combat_start.mp3')` or `audioService.playSfx('/audio/sfx/level_up.mp3')`. All calls end with `.catch(() => {})` so a missing file is always silent.

**Called from:** `StoryScreen.handleAction()` after `processParsedOutput()` completes. Combat and level-up are detected with regex against `fullText`:
```typescript
const hasCombat = /\b(attack|battle|fight|combat|sword|slash|dodge|parry|kill)\b/i.test(fullText);
const isLevelUp = /\b(level up|leveled up|rank up|breakthrough|advanced to)\b/i.test(fullText);
```
`tensionLevel` is derived from `state.actionCount`: `> 15 → 'high'`, `> 8 → 'medium'`, else `'low'`.

---

### `src/services/voiceAssignmentService.ts`

Maps character names to Nova Sonic voice IDs, persisting the assignment in both `localStorage` and `character.metadata_json`.

**Constants:**
- `VOICE_POOL = ['alloy', 'echo', 'fable', 'onyx', 'shimmer', 'nova']` — 6 available voices
- `NARRATOR_VOICE = 'onyx'` — narrator always gets `onyx`
- `STORAGE_PREFIX = 'eden_voice_'`

**Storage key format:** `eden_voice_<novelId>_<character_name_lowercased_underscored>`

**`hashCode(str)`** — djb2-style hash, modulo `VOICE_POOL.length`. Deterministic: same character name always maps to the same voice until manually changed.

**`getVoiceForCharacter(novelId, characterName, isNarrator?)`**
- Synchronous. Returns narrator voice if `isNarrator`.
- Checks `localStorage` first; if found, returns it.
- Otherwise computes via hash and saves to `localStorage`.

**`assignVoice(novelId, characterName, isNarrator?)`**
- Async. Same logic but also writes `voice_id` into `character.metadata_json` via `updateCharacter()` if not already set.
- Used by `StoryScreen` whenever a new finished bubble arrives and Nova provider is active.

**`clearVoiceAssignments(novelId)`**
- Removes all `localStorage` keys with prefix `eden_voice_<novelId>_`.
- Called when a novel is deleted (cleanup).

---

### `src/services/predictiveEngine.ts`

Singleton `PredictiveEngine` class exported as `predictiveEngine`. Pre-generates scene text for pending choices in the background immediately after a scene resolves, so the next player action can be served from cache.

**Constants:**
- `ENABLED_KEY = 'eden_predictive_enabled'`
- `MAX_AGE_MS = 5 * 60 * 1000` (5 minutes)
- `MAX_PRE_GENERATE = 2` — pre-generates the first 2 choices in parallel

**`CacheEntry` interface:**
```typescript
interface CacheEntry {
  fullText: string;    // Full raw AI output string
  timestamp: number;  // Date.now() at cache time
}
```

**`isEnabled()`** — reads `localStorage.getItem(ENABLED_KEY) !== 'false'`.

**`hasCached(choice)`** — returns `true` if a non-expired entry exists for `choice`.

**`consume(choice)`** — retrieves and **removes** the cache entry for `choice`. Returns `null` if missing or expired (TTL enforced: `Date.now() - entry.timestamp > MAX_AGE_MS`). TTL is checked both in `hasCached()` and `consume()` to guard against race conditions.

**`clear()`** — clears entire cache map and resets `busy` flag. Called when the novel changes.

**`preGenerate(novelId, timelineId, mcUid, mcName, genre, choices, maxTokens, temperature)`**
- If disabled, busy, or no choices → returns immediately.
- Sets `busy = true`, clears cache.
- Builds `GenerationCallbacks` for each choice with a `buf` object collecting tokens. All callbacks except `onToken` are no-ops.
- Calls `generateNextScene(..., dryRun = true)` for the top `MAX_PRE_GENERATE` choices in `Promise.all`.
- The `dryRun = true` flag tells `orchestrationService` to skip all DB/state mutations (no `incrementScene`, no `recordMemory`, no inventory writes, no character creation).
- If generated text is longer than 50 chars, stores it as `CacheEntry`.
- Always resets `busy = false` in the `finally` block.

**Used in `StoryScreen`:** After `processParsedOutput()` detects choices, `predictiveEngine.preGenerate()` is called immediately. On the next player action, `handleAction()` calls `predictiveEngine.consume(action)` first. If a cached result is returned, the normal `generateNextScene()` call is skipped and `applyParsedEffects()` is called instead to apply all DB mutations that were skipped during the dry-run pre-generation.

---

### `src/services/minigameService.ts`

Pure functions module — no class, no singleton. Exports `shouldTriggerMinigame()`, the `MinigameType` union, and the `MinigameResult` interface.

**`MinigameType`:**
```typescript
type MinigameType = 'qte' | 'dialogue' | 'memory' | 'negotiation' | 'stealth' | 'combat' | 'exam';
```

**`GENRE_TRIGGERS`** — keyword-based triggers per genre. Each entry is `{ keywords: string[], minigame: MinigameType }`. Trigger fires with 40% probability (`Math.random() < 0.4`) when any keyword matches (case-insensitive substring). Examples:

| Genre | Keywords | Minigame |
|---|---|---|
| combat/fantasy | attack, fight, battle, sword, slash, dodge, parry | combat |
| zombie | attack, horde, bite, fight, run | qte |
| cultivation | meditat, break through, pill, heavenly, tribulation | exam |
| school | exam, test, quiz, class, study | exam |
| school | confess, talk to, ask, approach | dialogue |
| cyberpunk | hack, terminal, decrypt, bypass, system | memory |
| cyberpunk | sneak, stealth, guard, security | stealth |
| mafia | negotiate, deal, payment, demand, price | negotiation |
| romance | confess, tell them, approach, talk, flirt | dialogue |
| military_war | attack, assault, fight, ambush, charge | qte |
| thriller | run, escape, chase, evade, hide | qte |

**`DEFAULT_MINIGAMES_BY_GENRE`** — fallback minigame per genre, triggered when `actionCount % 10 === 0`.

**`shouldTriggerMinigame(genre, text, actionCount): MinigameType | null`**
1. Returns `null` if `eden_minigames_enabled === 'false'` or `actionCount < 3`.
2. Scans `GENRE_TRIGGERS[genre]` against lowercased `text`. Fires on first keyword match with 40% random chance.
3. If `actionCount > 0 && actionCount % 10 === 0`, fires the genre's default minigame (guaranteed, no random roll).
4. Returns `null` if no trigger fires.

**`MinigameResult` interface:**
```typescript
interface MinigameResult {
  statEffects: Record<string, number>;                         // stat key → numeric delta
  inventoryChanges: Array<{ item: string; qty: number }>;
  relationshipChanges: Array<{ uid: string; delta: number }>; // additive, uses applyRelationshipDelta
  outcomeText: string;                                         // injected as narrator bubble
}
```

---

### `src/services/environmentImageService.ts`

Single exported async function.

**`getEnvironmentImage(genre, locationName): Promise<string | null>`**

1. Returns `null` if `locationName` is empty.
2. Calls `import.meta.glob('/public/environments/**/*.{png,jpg,jpeg,webp}', { eager: false })` at module scope to build a registry of all environment image paths without loading them.
3. Filters candidates to those starting with `/public/environments/<genre>/`.
4. Returns `null` if no candidates exist for that genre.
5. Scores each candidate by counting word overlaps between `locationName` and the file path (words of length > 2, split on spaces/dashes/slashes).
6. Sorts by score descending.
7. If best score is 0 (no overlap), selects a random candidate.
8. Dynamically imports the winning module (`() => Promise<{ default: string }>`) and returns `mod.default` (the Vite-resolved URL).
9. Returns `null` on any import error.

**Called from:** `StoryScreen.processParsedOutput()` whenever `parsed.locationChange` is set and `eden_env_images_enabled !== 'false'`. The result is inserted as an `EnvironmentBubble` with `isEnvironment: true`.

---

## 17. New Components — Task #3

### `src/components/chat/EnvironmentBubble.tsx`

A wide cinematic card inserted into the bubble list whenever the story's location changes.

**Props:**
```typescript
interface Props {
  locationName: string;
  imageUrl?: string | null;
}
```

**Layout:** `mx-2 my-3 rounded-xl overflow-hidden relative h-48` (fixed 192px height). Full-width within the chat column.

**Image behavior:**
- If `imageUrl` is provided: renders `<img>` with `object-cover` filling the full card.
- If not: renders a `bg-gray-800/60` placeholder with a `🗺` icon.

**Overlay:** `bg-gradient-to-t from-black/80 via-transparent to-transparent` covers the bottom half, giving depth to the location label.

**Location label:** Absolutely positioned at bottom-left. Animated pulsing emerald dot + truncated location name in white.

**Animation:** Framer Motion `motion.div`, `initial={{ opacity: 0, y: 8 }}` → `animate={{ opacity: 1, y: 0 }}`, spring stiffness 340 / damping 28.

**Deduplication:** `StoryScreen` tracks `lastEnvLocationRef` (a `useRef<string>('')`). An `EnvironmentBubble` is only inserted when `parsed.locationChange !== lastEnvLocationRef.current`. This prevents duplicate environment cards when back-to-back scenes resolve at the same location.

---

### `src/components/minigames/MinigameWrapper.tsx`

A pure switch-router component. Receives `type: MinigameType`, `genre: string`, and `onComplete: (result: MinigameResult) => void`. Mounts the corresponding minigame component and passes `onComplete` and `genre` through.

```typescript
switch (type) {
  case 'qte':         return <QTEMinigame onComplete={onComplete} genre={genre} />;
  case 'dialogue':    return <DialogueMinigame onComplete={onComplete} genre={genre} />;
  case 'memory':      return <MemoryMinigame onComplete={onComplete} genre={genre} />;
  case 'negotiation': return <NegotiationMinigame onComplete={onComplete} genre={genre} />;
  case 'stealth':     return <StealthMinigame onComplete={onComplete} genre={genre} />;
  case 'combat':      return <CombatMinigame onComplete={onComplete} genre={genre} />;
  case 'exam':        return <ExamMinigame onComplete={onComplete} genre={genre} />;
  default:            return null;
}
```

**Used in:** `StoryScreen`, wrapped in `<AnimatePresence>`. `activeMinigame` state drives visibility.

---

### `src/components/minigames/QTEMinigame.tsx`

**Mechanic:** A progress bar fills from 0 to 100% over 2200ms via `requestAnimationFrame`. A yellow highlight zone occupies 25% of the bar at a random start position (`0.35 + Math.random() * 0.2`). Player taps a large circular button; success = pointer lands within the zone.

**Success result:** `statEffects: { reflexes: 2 }`, outcome text: "Your reflexes are sharp — you react with perfect timing!"
**Miss/timeout result:** empty `statEffects`, outcome text varies by whether the player tapped late or not at all.

---

### `src/components/minigames/CombatMinigame.tsx`

**Mechanic:** Turn-based combat. Player and enemy each start with 6 HP (shown as colored squares). Player picks from three moves: `attack`, `defend`, `skill`. Enemy cycles through a fixed sequence `['attack', 'defend', 'attack', 'attack', 'skill', 'defend']`.

**Outcome matrix (`OUTCOME[playerMove][enemyMove]` → HP delta, positive = enemy damage):**

| Player \ Enemy | attack | defend | skill |
|---|---|---|---|
| attack | 0 | -1 | +2 |
| defend | +1 | 0 | -1 |
| skill | -1 | +2 | 0 |

**End condition:** Either HP reaches 0. Victory: `statEffects: { strength: 2, health: -1 }`. Defeat: `statEffects: { health: -2 }`.

---

### `src/components/minigames/DialogueMinigame.tsx`

**Mechanic:** Multi-round NPC conversation. Each round shows an NPC line and 3 response options each with a hidden score (0–3). Player accumulates score over all rounds. Success threshold: ≥ 60% of max possible score.

**Genre variants:** Has specialized scenario sets for `romance` and `default`. Uses `SCENARIOS[genre] ?? SCENARIOS.default`.

**Success result:** `statEffects: { charisma: 2 }`, "Your words land perfectly — a bond is forged."
**Failure result:** empty stats, "The conversation ends awkwardly."

---

### `src/components/minigames/MemoryMinigame.tsx`

**Mechanic:** 4-pair (8-card) symbol matching game. Symbols are a subset of `['🗡', '🔮', '💀', '🌙', '⚡', '🔥', '❄', '🌀']`. Cards are shuffled randomly on mount. Player flips two cards at a time; mismatches flip back after 700ms. Completes when all 4 pairs are matched.

**Scoring:** "Bonus" threshold = `pairs.length * 2 + 2 = 10 moves` or fewer.
**Bonus success:** `statEffects: { intelligence: 2 }`, "Your memory is razor-sharp..."
**Standard success:** `statEffects: { intelligence: 1 }`, "You piece it together, though the edges feel blurry."

---

### `src/components/minigames/NegotiationMinigame.tsx`

**Mechanic:** Price negotiation. NPC starts with a demand of 100. Player picks from 4 offer amounts (60%, 75%, 90%, or full demand) each round.

**Outcome logic:**
- Offer ≥ current demand → instant deal, `charisma: +1`
- Offer ≥ 60 (MINIMUM_ACCEPT) after 2+ rounds, and ≥ 85% of demand → NPC concedes, `charisma: +3, wealth: +1`
- Offer < 60 after 3+ rounds → negotiation collapses, no stat gain
- Otherwise → NPC reduces demand by 7–10%, continues

---

### `src/components/minigames/StealthMinigame.tsx`

**Mechanic:** 5×5 grid. Player starts at `(0, 4)` (bottom-left), exit at `(4, 4)` (bottom-right), guard starts at `(2, 0)` (top-center). Player moves with arrow buttons; guard moves one step closer to the player each turn (Chebyshev distance).

**End conditions:**
- Guard occupies same cell as player → caught, no stat gain
- Player reaches exit → escaped. `stealth: +3` if ≤ 6 moves; `stealth: +1` otherwise

---

### `src/components/minigames/ExamMinigame.tsx`

**Mechanic:** Multiple-choice quiz. Questions are genre-specific (has sets for `cultivation` and `school`, falls back to `default`). Shows correct/incorrect feedback with green/red highlight for 700ms before advancing.

**Scoring:** Success if ≥ 60% of questions answered correctly.
**Success:** `statEffects: { intelligence: 3 }`, "Your knowledge is formidable."
**Failure:** `statEffects: { intelligence: 1 }`, "There is still much to learn."

---

## 18. Modified Files — Task #3

### `src/screens/StoryScreen.tsx` (major rewrite)

The screen gained four new responsibilities and one new UI element:

**1. Minigame integration**
```typescript
const [activeMinigame, setActiveMinigame] = useState<MinigameType | null>(null);
```
After every `handleAction()` call, `shouldTriggerMinigame(state.genre, fullText, newCount)` is evaluated. If it returns a type, `setActiveMinigame(type)` mounts the overlay. `handleMinigameComplete()` dismisses it, adds an outcome narrator bubble, and applies `MinigameResult` effects:
- `statEffects` → reads current `stats_json` from `progressionDB`, applies deltas, writes back
- `inventoryChanges` → calls `addItem` / `removeItem` via `inventoryDB`
- `relationshipChanges` → calls `applyRelationshipDelta(novelId, mcUid, uid, delta)` from `characterDB`

**2. Predictive engine integration**
- After `processParsedOutput()` detects choices: `predictiveEngine.preGenerate(...)` fires immediately (background, non-blocking).
- At the top of `handleAction()`: `predictiveEngine.consume(action)` is checked first. If a cached result exists, `generateNextScene()` is skipped entirely and `applyParsedEffects()` is called to replay all DB mutations.

**3. Audio orchestration integration**
After `processParsedOutput()` completes, `orchestrateScene(...)` is called with combat/level-up detection and tension derived from `actionCount`.

**4. Nova TTS with voice assignment**
Added a `useEffect` that fires on every new bubble when `provider === 'nova'`. Reads `eden_narrator_voice_enabled` / `eden_char_voices_enabled` from localStorage. Calls `assignVoice(novelId, speaker)` (async) and passes the result as the `voice` parameter to `novaSonicService.speakBubble()`. This gives each character a stable, persistent voice across sessions.

**5. Environment bubble insertion**
Inside `processParsedOutput()`, when `parsed.locationChange` fires and `eden_env_images_enabled !== 'false'`, `getEnvironmentImage(genre, locName)` is called (async). On resolution, an `isEnvironment: true` bubble is added via `addBubble()`. Deduplication via `lastEnvLocationRef`.

**6. 5-tab navigation**
Nav items are now:

| Key | Icon | Opens |
|---|---|---|
| `story` | BookOpen | (closes all panels) |
| `characters` | Users | CharacterPanel |
| `status` | BarChart2 | StatusPanel |
| `world` | Globe | WorldPanel |
| `inventory` | Package | InventoryPanel |

The Ask Eden tab was removed from the nav. `AskEdenPanel` remains in the component tree but is no longer nav-accessible. (It can be re-added or wired separately.)

**7. MC portrait in player bubbles**
`MessageBubble` now receives `mcPortraitPath={novel?.mc_portrait_path || undefined}` for `isUser` bubbles, enabling portrait display for player messages if a portrait is set.

**New imports in StoryScreen:**
```typescript
import EnvironmentBubble from '../components/chat/EnvironmentBubble';
import MinigameWrapper from '../components/minigames/MinigameWrapper';
import { shouldTriggerMinigame } from '../services/minigameService';
import type { MinigameResult } from '../services/minigameService';
import { predictiveEngine } from '../services/predictiveEngine';
import { getEnvironmentImage } from '../services/environmentImageService';
import { orchestrateScene } from '../services/audioOrchestrator';
import { assignVoice } from '../services/voiceAssignmentService';
import { applyParsedEffects } from '../services/orchestrationService';
import { applyRelationshipDelta } from '../database/characterDB';
import { getProgression, updateProgression } from '../database/progressionDB';
```

---

### `src/services/orchestrationService.ts` (extended)

**New export: `applyParsedEffects()`**

A new exported function that accepts the same `(novelId, timelineId, mcUid, mcName, genre, fullText, callbacks)` signature but only runs the post-generation tag processing pipeline — no AI call, no streaming, no `generateStream()` invocation. Used exclusively by `StoryScreen` when serving a predictive-cache hit to ensure all DB mutations (world state, characters, inventory, level-up, chapter close) are applied identically to the normal path.

**New parameter: `dryRun?: boolean`**

`generateNextScene()` accepts an optional 12th parameter `dryRun?: boolean`. When `true`:
- Skips `incrementScene()`
- Skips `incrementSceneCountAtLocation()`
- Skips `recordMemory()`
- Skips all DB writes (character creation, inventory changes, relationship updates, level-up, chapter close)
- Streams to callbacks normally so the text is captured by the caller

This is the mechanism that allows `predictiveEngine.preGenerate()` to generate valid scene text without corrupting world state.

---

### `src/database/characterDB.ts` (extended)

**New export: `applyRelationshipDelta(novelId, mcUid, targetUid, delta)`**

An additive relationship update helper. Reads the existing relationship record between `mcUid` and `targetUid`, adds `delta` to the current `value`, and calls `updateRelationship()`. Creates the relationship record if it doesn't exist (defaults to type `'affinity'`, value `0`). Used by `StoryScreen.handleMinigameComplete()` to apply `MinigameResult.relationshipChanges`.

---

### `src/context/StoryContext.tsx` — `Bubble` type extension

The `Bubble` type now includes two optional fields for environment bubbles:

```typescript
interface Bubble {
  // ...existing fields...
  isEnvironment?: boolean;         // true = render as EnvironmentBubble
  environmentImageUrl?: string | null;  // resolved image URL from environmentImageService
}
```

`StoryScreen` renders environment bubbles first in the bubble map:
```typescript
if (b.isEnvironment) return <EnvironmentBubble key={b.id} locationName={b.content} imageUrl={b.environmentImageUrl} />;
```

---

### `src/services/novaSonicService.ts` (extended)

`speakBubble(id, text, speaker?, isNarrator?, voice?)` now accepts an optional fifth parameter `voice?: string`. If provided, this voice id is passed directly to the Nova Sonic TTS request instead of the default voice selection logic. This enables `voiceAssignmentService` to ensure each character keeps the same voice across sessions.

---

## 19. Cinematic UI Redesign — Three Screens

All three setup screens were given a full dark anime visual treatment. No logic was changed — only the JSX/CSS layer.

### `src/screens/ProviderSelectionScreen.tsx`

**Background:** Full-screen `bg-[#04040e]` with an animated star field (random `position: absolute` white dots at various sizes and opacities) and two large blurred radial gradient orbs (`blur-[120px]`, indigo/purple tones).

**Logo block:** Centered animated logo using a glyph (`✦`) on a gradient background, with a glowing drop shadow. Tagline and subtitle text in muted white/gray.

**Provider cards:** Each card uses its own `accentFrom`/`accentTo` gradient for the left border accent strip. Features list with check icons. A `badge` field (e.g. "Recommended") shows as a colored pill. Cards use `bg-white/[0.03] border-white/[0.07]` glass morphism styling with hover glow via `box-shadow`.

**Animation:** Cards animate in with staggered Framer Motion `initial={{ opacity: 0, y: 20 }}` with `delay: index * 0.06s`.

---

### `src/screens/NovelSelectionScreen.tsx`

**Background:** Same `bg-[#04040e]` + atmospheric orbs pattern (indigo top-center blur, violet bottom-right blur).

**Header:** Logo mark icon + "EDEN" wordmark + "Settings" and "Create" action buttons. Glassmorphism border `border-white/5`.

**Novel cards:** Each card has a genre-tinted left border (using `GENRES[genre].color`), chapter count badge, last-played timestamp, and a chevron. Hover state lifts the card slightly with subtle background brightening. The delete confirmation flow shows a red destructive button for 3 seconds on first tap.

**Empty state:** Cinematic centered card with the Eden logo glyph, tagline, feature list, and a CTA button. Framer Motion fade-in.

**Loading state:** Subtle spinner with "Loading your stories…" text.

---

### `src/screens/GenrePickerScreen.tsx`

**Shared components extracted:**

`StepHeader({ onBack, icon, title, subtitle })` — reusable header bar used by Setup, Traits, and Skills steps. Back arrow, optional emoji icon, title + subtitle.

`StepDots` / step progress indicator — row of dots showing current step.

`TraitDropdown({ label, options, value, onChange })` — animated dropdown with dark glass styling. Uses `AnimatePresence` for the options list. Label is uppercase tracking-widest. Selected value shows in white, placeholder in `text-gray-700`.

**Genre step:** Genres are rendered as a 2-column grid. Each genre card has its icon large-displayed, name, and description. Active genre gets a `ring-2 ring-indigo-500` border and colored background tint. Cards have subtle per-genre hover glow via `box-shadow` using the genre's color.

**Setup step:** Glass-styled inputs with `bg-white/3 border-white/8` and `focus:border-indigo-500/50`. Starting location uses a combined `<select>` + optional custom text field.

**Traits step:** Four `TraitDropdown` components in a scrollable column.

**Skills step:** Point allocation grid with `+`/`-` buttons. Remaining points counter shown at top. Skill cards show a genre-matching icon and description.

**CTA buttons:** Full-width gradient buttons (`from-indigo-600 to-violet-600`) with forward arrow icon and spring-press scale animation.

---

## 20. Updated Connection Map — Task #3 Additions

The following connections are new in Task #3. They extend (not replace) the connection map in Section 15.

```
screens/StoryScreen.tsx
  → services/audioOrchestrator.ts → orchestrateScene()
      → services/audioService.ts → playAmbient(), playMusic(), playSfx()

  → services/voiceAssignmentService.ts → assignVoice()
      → database/characterDB.ts → getCharactersByNovel(), updateCharacter() [writes voice_id to metadata_json]

  → services/predictiveEngine.ts → preGenerate(), consume()
      → services/orchestrationService.ts → generateNextScene(..., dryRun=true) [no DB writes]

  → services/orchestrationService.ts → applyParsedEffects() [cache hit path only]

  → services/environmentImageService.ts → getEnvironmentImage()
      → import.meta.glob('/public/environments/**')

  → services/minigameService.ts → shouldTriggerMinigame()

  → components/chat/EnvironmentBubble.tsx [rendered on isEnvironment bubbles]

  → components/minigames/MinigameWrapper.tsx
      → components/minigames/QTEMinigame.tsx
      → components/minigames/CombatMinigame.tsx
      → components/minigames/DialogueMinigame.tsx
      → components/minigames/MemoryMinigame.tsx
      → components/minigames/NegotiationMinigame.tsx
      → components/minigames/StealthMinigame.tsx
      → components/minigames/ExamMinigame.tsx

  → database/characterDB.ts → applyRelationshipDelta() [new: minigame relationship changes]
  → database/progressionDB.ts → getProgression(), updateProgression() [minigame stat effects]

services/orchestrationService.ts
  → [new] applyParsedEffects() export ← called by StoryScreen on predictive cache hits
  → [new] dryRun?: boolean param on generateNextScene() ← called by predictiveEngine

database/characterDB.ts
  → [new] applyRelationshipDelta(novelId, mcUid, targetUid, delta) export

context/StoryContext.tsx
  → [extended] Bubble type: + isEnvironment?: boolean, + environmentImageUrl?: string | null
```

---

*Last updated: Task #3 (UI Redesign, Media & Systems) complete. All new services, components, and screen redesigns documented. TypeScript passes with zero errors.*

---

## 21. Amazon Bedrock Integration & 24-Item Bug/Feature Batch

This section documents every file added or changed in the Bedrock integration + bug-fix batch. Changes are grouped by file. The batch introduced Amazon Bedrock as the primary recommended AI provider, removed the legacy Nova-as-a-standalone-provider approach (Nova is now a sub-identity inside Bedrock), fixed the settings toggle UI, fixed the App.tsx routing guard, silenced a noisy orchestration error, and created `.env.example` files at both the monorepo root and inside the artifact.

---

### 21.1 NEW FILE — `artifacts/eden-novel/src/services/bedrockService.ts`

**What it is:** A standalone, self-contained HTTP client for Amazon Bedrock's OpenAI-compatible gateway endpoint. It has zero dependencies on anything else in the project — it only uses the browser `fetch` API.

**Endpoint:**
```
https://bedrock-mantle.us-east-1.api.aws/v1
```
This is the Bedrock Mantle endpoint, which exposes an OpenAI-compatible `/chat/completions` interface. It is region-locked to `us-east-1`. No AWS IAM credentials are required — authentication uses an ABSK (Amazon Bedrock Serverless Key) passed as a standard `Authorization: Bearer <key>` header.

**Exported constants and types:**

| Export | Type | Description |
|---|---|---|
| `BEDROCK_BASE_URL` | `string` (internal const) | Base URL for all Bedrock API calls |
| `BedrockModel` | `interface` | `{ id: string; name: string; group: string }` — one selectable model |
| `BEDROCK_MODELS` | `BedrockModel[]` | Full catalogue of 14 models (see below) |
| `BEDROCK_DEFAULT_MODEL` | `string` | `'qwen.qwen3-32b-v1:0'` — Qwen3 32B |
| `BEDROCK_GROUPS` | `string[]` | Derived array of unique group names via `[...new Set(...)]` |

**The 14 models in `BEDROCK_MODELS`, grouped:**

| Group | Model ID | Display Name |
|---|---|---|
| Qwen | `qwen.qwen3-32b-v1:0` | Qwen3 32B *(default)* |
| Qwen | `qwen.qwen3-coder-30b-a3b-v1:0` | Qwen3 Coder 30B |
| Gemma | `google.gemma-3-4b-it` | Gemma 3 4B |
| Gemma | `google.gemma-3-12b-it` | Gemma 3 12B |
| Gemma | `google.gemma-3-27b-it` | Gemma 3 27B |
| Mistral | `mistral.ministral-3-3b-instruct` | Ministral 3B |
| Mistral | `mistral.ministral-3-8b-instruct` | Ministral 8B |
| Mistral | `mistral.ministral-3-14b-instruct` | Ministral 14B |
| MiniMax | `minimax.minimax-m2.1` | MiniMax M2.1 |
| MiniMax | `minimax.minimax-m2.5` | MiniMax M2.5 |
| NVIDIA | `nvidia.nemotron-nano-9b-v2` | Nemotron Nano 9B |
| GLM | `zai.glm-4.7` | GLM-4.7 |
| GLM | `zai.glm-5` | GLM-5 |
| OpenAI OSS | `openai.gpt-oss-120b` | GPT OSS 120B |

**Internal helper `buildMessages(systemPrompt, userPrompt)`:**
Constructs the OpenAI-compatible `messages` array. If `systemPrompt` is non-empty, a `{ role: 'system', content: systemPrompt }` object is prepended before the `{ role: 'user', content: userPrompt }` object. This keeps the system prompt optional — Bedrock models that do not support system roles won't receive one.

**`bedrockStream(apiKey, model, systemPrompt, userPrompt, options?)`** → `AsyncGenerator<string>`

Sends a streaming `POST /v1/chat/completions` request with `stream: true`. The response body is read as a `ReadableStream`. Tokens are parsed from SSE lines: each `data: {...}` line is JSON-parsed and `choices[0].delta.content` is yielded if present. The `[DONE]` sentinel and blank lines are silently skipped. Error handling:
- HTTP 401 → `'Invalid Bedrock API key. Check your ABSK key.'`
- HTTP 429 → `'Bedrock rate limit reached. Please wait a moment.'`
- Any other non-OK → reads first 200 chars of response body for the error message.

Default options: `maxTokens = 1000`, `temperature = 0.7`.

**`bedrockGenerateText(apiKey, model, systemPrompt, userPrompt, options?)`** → `Promise<string>`

Non-streaming version. Sends the same request with `stream: false` and reads `choices[0].message.content` from the JSON response. Used for short completions (choice regeneration, connection test). Default options: `maxTokens = 400`, `temperature = 0.7`.

**`bedrockTestConnection(apiKey, model)`** → `Promise<{ success: boolean; error?: string; latencyMs?: number }>`

Wraps `bedrockGenerateText` with a minimal prompt (`'Reply with only the word: OK'`, `maxTokens: 10`, `temperature: 0`). Records wall-clock latency. Returns `{ success: true, latencyMs }` on success or `{ success: false, error }` on any exception or empty response.

**Connections:**
- **Imported by:** `modelService.ts`, `ApiKeySetupScreen.tsx`, `SettingsScreen.tsx`

---

### 21.2 CHANGED — `artifacts/eden-novel/src/services/modelService.ts`

**Summary of all changes:**

#### `AIProvider` type union extended
```ts
// Before:
export type AIProvider = 'huggingface' | 'grok' | 'gemini' | 'openai' | 'claude' | 'deepseek' | 'nova';
// After:
export type AIProvider = 'huggingface' | 'grok' | 'gemini' | 'openai' | 'claude' | 'deepseek' | 'nova' | 'bedrock';
```
`'bedrock'` is now a valid first-class provider ID. `'nova'` is kept for backwards compatibility — any user who had `ai_provider = 'nova'` in localStorage will continue to work; both `'nova'` and `'bedrock'` are treated identically in all routing logic.

#### `PROVIDER_KEY_MAP` extended
Both `'nova'` and `'bedrock'` map to the same localStorage key `'bedrock_api_key'`, so they share a single stored credential:
```ts
nova:    'bedrock_api_key',
bedrock: 'bedrock_api_key',
```

#### `ENV_FALLBACK_MAP` added (new)
A new map allows API keys to be pre-seeded from Vite environment variables so users who set a `.env` file don't have to enter keys manually in the UI. The map covers all eight providers:
```ts
const ENV_FALLBACK_MAP: Record<string, string> = {
  grok:        'VITE_GROK_API_KEY',
  gemini:      'VITE_GEMINI_API_KEY',
  openai:      'VITE_OPENAI_API_KEY',
  claude:      'VITE_CLAUDE_API_KEY',
  deepseek:    'VITE_DEEPSEEK_API_KEY',
  nova:        'VITE_BEDROCK_API_KEY',
  bedrock:     'VITE_BEDROCK_API_KEY',
  huggingface: 'VITE_HF_TOKEN',
};
```
The helper `getEnvFallback(provider)` reads from `import.meta.env` (typed as `Record<string, string>`). It is called in two places:
1. `ModelService` constructor — seeds `this.hfToken` from env if localStorage is empty.
2. `getApiKey(provider)` — falls back to env if localStorage has no stored key for that provider.

#### `getApiKey()` — env fallback logic added
```ts
getApiKey(provider?: AIProvider): string {
  const p = provider ?? this.getProvider();
  const storageKey = PROVIDER_KEY_MAP[p];
  if (!storageKey) return '';
  const stored = localStorage.getItem(storageKey) || '';
  if (stored) return stored;
  return getEnvFallback(p);  // ← NEW: falls back to VITE_* env var
}
```
Priority is: localStorage first, then `import.meta.env`, then empty string.

#### `setProvider()` — `'bedrock'` branch added
When the user selects `'bedrock'`, the selected model is read from `localStorage.getItem('bedrock_model')` (falling back to `BEDROCK_DEFAULT_MODEL`). This is stored in both `'selected_model'` (general model key) and `this.selectedModel`. The connection state is set based on whether an API key is already present.

#### `selectBedrockModel(modelId)` — new method
```ts
selectBedrockModel(modelId: string) {
  this.selectedModel = modelId;
  localStorage.setItem('selected_model', modelId);
  localStorage.setItem('bedrock_model', modelId);
  this.notifyListeners();
}
```
Writes the model to both localStorage keys so the model persists across sessions. Used by `SettingsScreen` when the user taps a model in the Bedrock model picker section.

#### `testConnection()` — Bedrock branch added
When provider is `'bedrock'` or `'nova'`, delegates to `bedrockTestConnection(key, model)` from `bedrockService.ts` instead of the generic HuggingFace model-list fetch.

#### `generateStream()` — Bedrock branch added
When provider is `'bedrock'` or `'nova'`:
```ts
if (p === 'bedrock' || p === 'nova') {
  const key = this.getApiKey(p);
  if (!key) throw new Error('No Bedrock API key set. Enter your ABSK key in Settings.');
  const model = this.selectedModel || BEDROCK_DEFAULT_MODEL;
  yield* bedrockStream(key, model, systemPrompt, userPrompt, options);
}
```

#### `generateText()` — Bedrock branch added
Same pattern as `generateStream()` but calls `bedrockGenerateText()` for non-streaming completions (choice regeneration).

#### `isLargeContextProvider()` in `orchestrationService.ts` updated
```ts
// Added 'bedrock' to the large-context set:
return p === 'grok' || p === 'gemini' || p === 'openai' || p === 'claude' || p === 'nova' || p === 'bedrock';
```
This means Bedrock users get the full `buildFullGrokContext()` prompt (all chapters, memories, characters, world state) rather than the compact 3-scene summary context.

---

### 21.3 CHANGED — `artifacts/eden-novel/src/screens/ProviderSelectionScreen.tsx`

#### Nova card removed
The standalone `'nova'` provider card was removed from the `PROVIDERS` array entirely. Nova is no longer a top-level option because it is a subset of Bedrock; its API key is the same ABSK key.

#### Bedrock card added at position [0] (top of list)
```ts
{
  id: 'bedrock',
  name: 'Amazon Bedrock',
  subtitle: 'Massive multi-model AI ecosystem',
  emoji: '🪨',
  color: 'amber',
  accentFrom: '#d97706',
  accentTo: '#92400e',
  features: [
    'Qwen · Gemma · Mistral · Nova',
    'OpenAI OSS · GLM · MiniMax · NVIDIA',
    'ABSK API key — no IAM needed',
    'Streaming · Long context support',
  ],
  needsKey: true,
  badge: 'Recommended',
}
```
The `badge: 'Recommended'` field causes a gold pill to appear in the top-right corner of the card. Bedrock is placed first (index 0) so it is the most prominent choice visually.

#### Provider order after change
1. Amazon Bedrock 🪨 *(Recommended badge)*
2. Grok by xAI 🚀
3. Gemini ✨
4. GPT (OpenAI) 🧠
5. Claude 🌙
6. DeepSeek 🔮
7. HuggingFace 🤗

#### Emoji updates across providers
All provider icons were audited and updated for visual consistency:
- Bedrock: `🪨`
- Grok: `🚀`
- Gemini: `✨`
- OpenAI: `🧠`
- Claude: `🌙`
- DeepSeek: `🔮`
- HuggingFace: `🤗`

#### `ACCENT_DOT` map — `'amber'` color added
The `ACCENT_DOT` record (maps color name → Tailwind text class for feature-list bullet dots) gained `amber: 'text-amber-400'` to support the Bedrock card.

#### Navigation in `handleSelect()`
When a provider with `needsKey: true` is selected (and it's not `'huggingface'`):
```ts
localStorage.setItem('pending_provider_setup', p);
navigate('/api-key-setup');
```
This was already the pattern for other providers and now also applies to `'bedrock'`. The `pending_provider_setup` key tells `ApiKeySetupScreen` which provider's info to display.

---

### 21.4 CHANGED — `artifacts/eden-novel/src/screens/ApiKeySetupScreen.tsx`

#### Bedrock entry added to `PROVIDER_INFO`
```ts
bedrock: {
  name: 'Amazon Bedrock',
  emoji: '🪨',
  color: 'amber',
  keyLabel: 'Bedrock API Key (ABSK)',
  keyPlaceholder: 'ABSK...',
  docsUrl: 'https://us-east-1.console.aws.amazon.com/bedrock/home#/api-keys',
  docsLabel: 'Get key at Bedrock console → API Keys',
  hint: 'Uses ABSK key auth · Region locked to us-east-1 · Streaming supported.',
  showModelPicker: true,
},
```

The `nova` entry was also updated to point to the Bedrock console and use the same `'ABSK...'` placeholder, and `showModelPicker: true` was added:
```ts
nova: {
  name: 'Nova by Amazon',
  emoji: '🪨',
  color: 'amber',
  keyLabel: 'Amazon Bedrock API Key (ABSK)',
  keyPlaceholder: 'ABSK...',
  docsUrl: 'https://us-east-1.console.aws.amazon.com/bedrock/home#/api-keys',
  docsLabel: 'Get key at Bedrock console → API Keys',
  hint: 'Nova is part of Amazon Bedrock. Uses ABSK key auth.',
  showModelPicker: true,
},
```

#### `COLOR_MAP` — `'amber'` entry added
```ts
amber: {
  ring:   'focus:ring-amber-600/50 border-amber-800/60',
  btn:    'bg-amber-700 hover:bg-amber-600',
  accent: 'text-amber-400',
  link:   'text-amber-500 hover:text-amber-400',
  select: 'border-amber-800/60',
},
```

#### Model picker UI — Bedrock grouped `<select>`
When `info.showModelPicker` is `true` (for `bedrock` and `nova` providers), a second form field appears below the API key input:
```tsx
<select
  value={selectedModel}
  onChange={e => setSelectedModel(e.target.value)}
  ...
>
  {BEDROCK_GROUPS.map(group => (
    <optgroup key={group} label={group}>
      {BEDROCK_MODELS.filter(m => m.group === group).map(m => (
        <option key={m.id} value={m.id}>{m.name}</option>
      ))}
    </optgroup>
  ))}
</select>
```
The initial `selectedModel` state is seeded from `localStorage.getItem('bedrock_model') || BEDROCK_DEFAULT_MODEL`. A `<ChevronDown>` icon is positioned absolutely over the select. A helper text reads `"Default: Qwen3 32B — best for stories"`.

#### `handleSave()` — model persistence
When `info.showModelPicker` is true, the save handler writes the selected model to both localStorage keys before navigating:
```ts
localStorage.setItem('bedrock_model', selectedModel);
localStorage.setItem('selected_model', selectedModel);
```

#### Imports added
```ts
import { BEDROCK_MODELS, BEDROCK_DEFAULT_MODEL, BEDROCK_GROUPS } from '../services/bedrockService';
import { ChevronDown } from 'lucide-react';
```

---

### 21.5 CHANGED — `artifacts/eden-novel/src/screens/SettingsScreen.tsx`

#### `PROVIDER_META` record — complete rewrite
Previously, the SettingsScreen had no structured per-provider metadata and fell back to brittle conditional rendering. Now a typed record `PROVIDER_META: Record<AIProvider, ProviderMeta>` covers all eight providers. The `ProviderMeta` interface:
```ts
interface ProviderMeta {
  emoji: string;
  label: string;
  modelLine: (model: string) => string;
  editKeyLabel: string;
  editKeyRoute: string;
  color: string;
  colorClass: string;
  borderClass: string;
}
```
The record covers: `bedrock`, `nova`, `grok`, `gemini`, `openai`, `claude`, `deepseek`, `huggingface`. The active provider's entry is resolved via `const meta = PROVIDER_META[provider] ?? PROVIDER_META.huggingface` so there is always a safe fallback.

#### `bedrock` entry
```ts
bedrock: {
  emoji: '🪨',
  label: 'Amazon Bedrock',
  modelLine: m => `Model: ${BEDROCK_MODELS.find(bm => bm.id === m)?.name ?? m.split('.').pop() ?? m}`,
  editKeyLabel: 'Edit Bedrock Key',
  editKeyRoute: '/api-key-setup',
  color: 'amber',
  colorClass: 'text-amber-400',
  borderClass: 'bg-amber-900/20 border-amber-700/40',
},
```
The `modelLine` function looks up the human-readable name from `BEDROCK_MODELS` by ID. If the ID isn't found (e.g. a future model), it falls back to the last segment of the ID after `.`.

#### `nova` entry
Kept for backward compatibility. Uses `⚡` emoji and `'Nova (Amazon Bedrock)'` label. Model line uses `m.split('.').pop()` (no BEDROCK_MODELS lookup since nova users may have non-catalogued IDs).

#### Bedrock model picker section — new `<Section>` block
A new settings section `"Bedrock Model"` appears when `isBedrock` is true (i.e. provider is `'bedrock'` or `'nova'`). It renders a group-by-group list of all 14 Bedrock models from `BEDROCK_GROUPS` / `BEDROCK_MODELS`. Each model is a `<button>`:
- Active model: `bg-amber-900/40 border-amber-700/60 text-amber-300 font-semibold`
- Inactive: `bg-gray-900/40 border-gray-800/40 text-gray-400 hover:text-gray-200`
- The default model (`qwen.qwen3-32b-v1:0`) gets a `"recommended"` label in `text-amber-500`.

`handleBedrockModelChange(modelId)` writes both `bedrock_model` and `selected_model` to localStorage synchronously (no debounce) so changes take effect on the very next scene generation without a page reload.

The `bedrockModel` state is initialized from `localStorage.getItem('bedrock_model') || BEDROCK_DEFAULT_MODEL` and kept in sync by the `handleBedrockModelChange` handler.

#### `displayModel` computation updated
```ts
const displayModel = isBedrock
  ? (BEDROCK_MODELS.find(m => m.id === bedrockModel)?.name ?? bedrockModel)
  : selectedModel?.split('/').pop() ?? 'Not set';
```
The `"About"` section footer now shows a human-readable Bedrock model name instead of the raw model ID.

#### Toggle UI fix — `ImmersionToggle` component
The `ImmersionToggle` function component (embedded at the bottom of `SettingsScreen.tsx`) was visually broken: the knob was visible but overflowed the track and the on/off states were not distinct. Fixed by:
- Track: `w-12 h-7` (48px × 28px) with `rounded-full`, `border`, and transition on background/border/shadow
- Enabled state: `bg-blue-600 border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]` (neon blue glow)
- Disabled state: `bg-gray-700 border-gray-600`
- Knob: `absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-md`
- Knob translate: `translate-x-[22px]` when on, `translate-x-[3px]` when off
- Smooth transition: `transition-transform duration-300 ease-in-out`

The toggle also gained `role="switch"` and `aria-checked={enabled}` for accessibility.

#### `isBedrock` and `isGrok` flags added
```ts
const isBedrock = provider === 'bedrock' || provider === 'nova';
const isGrok    = provider === 'grok';
```
`isBedrock` controls whether the Bedrock model picker section renders. `isGrok` controls whether the max-tokens slider is hidden (Grok handles token limits internally) and whether the "Grok Full Context Mode" info box appears.

#### Imports added
```ts
import { BEDROCK_MODELS, BEDROCK_GROUPS, BEDROCK_DEFAULT_MODEL } from '../services/bedrockService';
```

---

### 21.6 CHANGED — `artifacts/eden-novel/src/App.tsx`

#### `API_KEY_PROVIDERS` set extended
```ts
// Before:
const API_KEY_PROVIDERS = new Set(['gemini', 'openai', 'claude', 'deepseek', 'nova', 'grok']);
// After:
const API_KEY_PROVIDERS = new Set(['gemini', 'openai', 'claude', 'deepseek', 'nova', 'bedrock', 'grok']);
```
`'bedrock'` added so the routing guard applies to it.

#### Routing guard bug fix — `/api-key-setup` no longer redirects ready users away
**Before (broken):** When `isProviderReady` was `true` and the user was on `/api-key-setup`, the guard matched `location === '/api-key-setup'` in the "ready and on a setup page → go to /novels" condition and bounced the user away before they finished entering their key. This created an infinite redirect loop where users with a stored Bedrock key couldn't reach the key setup screen to edit it.

**After (fixed):**
```ts
if (API_KEY_PROVIDERS.has(provider)) {
  if (!isProviderReady) {
    if (location !== '/api-key-setup' && location !== '/provider-select') {
      navigate('/api-key-setup');
    }
    return;
  }
  // Only redirect away from these two screens, not from /api-key-setup:
  if (location === '/provider-select' || location === '/') {
    navigate('/novels');
  }
  return;
}
```
The key change: `/api-key-setup` was removed from the "ready → redirect to /novels" condition. Now, when `isProviderReady` is true:
- At `/provider-select` → redirected to `/novels`
- At `/` → redirected to `/novels`
- At `/api-key-setup` → **allowed to stay** (user is intentionally editing their key)

#### Grok early return preserved
Grok has its own `if (provider === 'grok')` block above the `API_KEY_PROVIDERS` check. It redirects the user to `/novels` from all setup screens including `/api-key-setup`. This is correct because Grok's API key is read from the environment (no user input required), but users may still navigate to `/api-key-setup` if they manually enter a key. The Grok block's logic was not changed.

---

### 21.7 CHANGED — `artifacts/eden-novel/src/services/orchestrationService.ts`

#### Choice re-generation — silent failure instead of `onError`
**Before:** When the secondary AI call to regenerate missing/duplicate choices failed (e.g. the model returned fewer than 2 choices), the code called `callbacks.onError(...)`, which displayed a visible error banner to the player and potentially stopped story progression.

**After:**
```ts
} catch {
  // Silent failure — story continues, user can tap the scene area to re-generate
  console.warn('[Eden] Choice re-generation failed silently.');
  return fullText;
}
```
The catch block now only logs a `console.warn` and returns the full text accumulated so far. The story continues to display normally — the player just won't have new choice buttons until they tap the scene to trigger a manual re-generation. This prevents false-positive error banners on choice generation hiccups.

#### `isLargeContextProvider()` updated
```ts
const isLargeContextProvider = () => {
  const p = modelService.getProvider();
  return p === 'grok' || p === 'gemini' || p === 'openai' || p === 'claude' || p === 'nova' || p === 'bedrock';
};
```
`'bedrock'` added. Bedrock models (especially Qwen3 32B and Gemma 3 27B) have 32K–128K context windows that can comfortably fit the full story context built by `buildFullGrokContext()`.

---

### 21.8 NEW FILE — `.env.example` (monorepo root)

**Path:** `/home/runner/workspace/.env.example`

A template file that documents all environment variables used by the Eden Novel project. Intended to be copied to `.env` by developers running locally.

```env
# Eden Novel — Server & Client Environment Variables
# Copy this file to .env and fill in your keys.
# Keys prefixed with VITE_ are exposed to the browser (Vite apps).
# Keys without VITE_ prefix are server-side only.

# ─── Amazon Bedrock (ABSK key — region locked to us-east-1) ───────────────────
VITE_BEDROCK_API_KEY=

# ─── Google Gemini ───────────────────────────────────────────────────────────
VITE_GEMINI_API_KEY=

# ─── xAI Grok ────────────────────────────────────────────────────────────────
VITE_GROK_API_KEY=

# ─── OpenAI ──────────────────────────────────────────────────────────────────
VITE_OPENAI_API_KEY=

# ─── HuggingFace ─────────────────────────────────────────────────────────────
VITE_HF_TOKEN=

# ─── Anthropic Claude ────────────────────────────────────────────────────────
VITE_CLAUDE_API_KEY=

# ─── DeepSeek ────────────────────────────────────────────────────────────────
VITE_DEEPSEEK_API_KEY=
```

All keys use the `VITE_` prefix because they are read inside the browser via `import.meta.env`. The `modelService.ts` `ENV_FALLBACK_MAP` maps each provider name to its corresponding env var key.

---

### 21.9 NEW FILE — `artifacts/eden-novel/.env.example`

**Path:** `/home/runner/workspace/artifacts/eden-novel/.env.example`

Identical in content to the root `.env.example` but lives inside the artifact directory for developers who want to run only the frontend in isolation (`pnpm --filter @workspace/eden-novel dev`). Vite reads `.env` from the project root of each package, so this file needs to exist in the artifact directory for Vite to pick it up.

```env
# Eden Novel — Environment Variables
# Copy this file to .env and fill in your keys.
# In Vite, expose client-side keys with the VITE_ prefix.

# Amazon Bedrock (ABSK key — region locked to us-east-1)
VITE_BEDROCK_API_KEY=

# Google Gemini
VITE_GEMINI_API_KEY=

# xAI Grok
VITE_GROK_API_KEY=

# OpenAI
VITE_OPENAI_API_KEY=

# HuggingFace
VITE_HF_TOKEN=

# Anthropic Claude
VITE_CLAUDE_API_KEY=

# DeepSeek
VITE_DEEPSEEK_API_KEY=
```

---

### 21.10 Provider Architecture — Before vs. After

#### Before this batch

| Provider | ID | Storage Key | Where key comes from |
|---|---|---|---|
| HuggingFace | `'huggingface'` | `hf_token` | User enters HF token in `/token-setup` |
| Grok | `'grok'` | `grok_api_key` | Env only (`VITE_GROK_API_KEY`) |
| Gemini | `'gemini'` | `gemini_api_key` | User enters in `/api-key-setup` |
| OpenAI | `'openai'` | `openai_api_key` | User enters in `/api-key-setup` |
| Claude | `'claude'` | `claude_api_key` | User enters in `/api-key-setup` |
| DeepSeek | `'deepseek'` | `deepseek_api_key` | User enters in `/api-key-setup` |
| Nova | `'nova'` | `bedrock_api_key` | User enters in `/api-key-setup`; routed to nova-server.js backend |

#### After this batch

| Provider | ID | Storage Key | Where key comes from | Endpoint |
|---|---|---|---|---|
| HuggingFace | `'huggingface'` | `hf_token` | User input or `VITE_HF_TOKEN` | `router.huggingface.co/v1` |
| Grok | `'grok'` | `grok_api_key` | User input or `VITE_GROK_API_KEY` | `api.x.ai/v1` |
| Gemini | `'gemini'` | `gemini_api_key` | User input or `VITE_GEMINI_API_KEY` | `generativelanguage.googleapis.com/v1beta/openai` |
| OpenAI | `'openai'` | `openai_api_key` | User input or `VITE_OPENAI_API_KEY` | `api.openai.com/v1` |
| Claude | `'claude'` | `claude_api_key` | User input or `VITE_CLAUDE_API_KEY` | `api.anthropic.com/v1` |
| DeepSeek | `'deepseek'` | `deepseek_api_key` | User input or `VITE_DEEPSEEK_API_KEY` | `api.deepseek.com/v1` |
| Amazon Bedrock | `'bedrock'` | `bedrock_api_key` | User input or `VITE_BEDROCK_API_KEY` | `bedrock-mantle.us-east-1.api.aws/v1` |
| Nova *(legacy)* | `'nova'` | `bedrock_api_key` | Same as bedrock | Same as bedrock |

Nova no longer routes through `nova-server.js`. Both `'nova'` and `'bedrock'` call `bedrockService.ts` directly from the browser.

---

### 21.11 Data Flow — New Bedrock Path

```
User selects "Amazon Bedrock" on ProviderSelectionScreen
    ↓
localStorage.setItem('pending_provider_setup', 'bedrock')
navigate('/api-key-setup')
    ↓
ApiKeySetupScreen reads pending_provider_setup → shows Bedrock form
  • ABSK key input (password field with show/hide toggle)
  • Grouped model selector (14 models in 8 groups via BEDROCK_MODELS / BEDROCK_GROUPS)
  • Link: Bedrock console → API Keys
User saves → saveApiKey('bedrock', key) + localStorage 'bedrock_model'
navigate('/novels')
    ↓
All subsequent generateStream() calls:
  modelService.generateStream()
    → p === 'bedrock'
    → bedrockStream(key, selectedModel, systemPrompt, userPrompt)
    → POST https://bedrock-mantle.us-east-1.api.aws/v1/chat/completions
       { model, messages, max_tokens, temperature, stream: true }
       Authorization: Bearer <ABSK key>
    → SSE stream → yields token strings
    → callbacks.onToken(token) → StoryContext.UPDATE_STREAMING
```

---

### 21.12 localStorage Keys Reference — Post-Batch

| Key | Type | Set by | Read by | Description |
|---|---|---|---|---|
| `ai_provider` | `AIProvider` string | `modelService.setProvider()` | `modelService.getProvider()`, `App.tsx` guard | Active provider ID |
| `bedrock_api_key` | string | `modelService.saveApiKey('bedrock')` | `modelService.getApiKey()` | Shared ABSK key (used by both `bedrock` and `nova`) |
| `bedrock_model` | string (model ID) | `ApiKeySetupScreen`, `SettingsScreen`, `modelService.selectBedrockModel()` | `modelService.setProvider('bedrock')`, `SettingsScreen` | Selected Bedrock model; persists across sessions |
| `selected_model` | string | `modelService.selectModel()`, `selectBedrockModel()` | `modelService.selectedModel` | General active model ID (also written when Bedrock model changes) |
| `hf_token` | string | `modelService.saveToken()` | `modelService.hfToken` | HuggingFace bearer token |
| `pending_provider_setup` | `AIProvider` string | `ProviderSelectionScreen.handleSelect()` | `ApiKeySetupScreen` | Tells the key setup screen which provider is being configured; removed on save |
| `grok_api_key` | string | `modelService.saveApiKey('grok')` | `modelService.getApiKey('grok')` | Grok/xAI API key |
| `gemini_api_key` | string | `modelService.saveApiKey('gemini')` | `modelService.getApiKey('gemini')` | Google Gemini API key |
| `openai_api_key` | string | `modelService.saveApiKey('openai')` | `modelService.getApiKey('openai')` | OpenAI API key |
| `claude_api_key` | string | `modelService.saveApiKey('claude')` | `modelService.getApiKey('claude')` | Anthropic Claude API key |
| `deepseek_api_key` | string | `modelService.saveApiKey('deepseek')` | `modelService.getApiKey('deepseek')` | DeepSeek API key |

---

### 21.13 Updated Connection Map — Bedrock Batch

The following connections are new or changed in this batch. They extend (not replace) the connection maps in Sections 15, 17, and 20.

```
[NEW] artifacts/eden-novel/src/services/bedrockService.ts
  ← imported by: modelService.ts (bedrockStream, bedrockGenerateText, bedrockTestConnection, BEDROCK_DEFAULT_MODEL)
  ← imported by: ApiKeySetupScreen.tsx (BEDROCK_MODELS, BEDROCK_DEFAULT_MODEL, BEDROCK_GROUPS)
  ← imported by: SettingsScreen.tsx (BEDROCK_MODELS, BEDROCK_GROUPS, BEDROCK_DEFAULT_MODEL)
  → calls: https://bedrock-mantle.us-east-1.api.aws/v1/chat/completions

modelService.ts
  → [changed] AIProvider union: + 'bedrock'
  → [changed] PROVIDER_KEY_MAP: nova+bedrock → 'bedrock_api_key'
  → [new]     ENV_FALLBACK_MAP + getEnvFallback() — reads VITE_* env vars
  → [changed] getApiKey(): env fallback after localStorage miss
  → [changed] setProvider(): + 'bedrock' branch
  → [new]     selectBedrockModel(modelId) — writes both localStorage keys
  → [changed] testConnection(): + bedrock/nova branch → bedrockTestConnection()
  → [changed] generateStream(): + bedrock/nova branch → bedrockStream()
  → [changed] generateText(): + bedrock/nova branch → bedrockGenerateText()

ProviderSelectionScreen.tsx
  → [removed] 'nova' ProviderCard
  → [added]   'bedrock' ProviderCard at position[0] with badge:'Recommended'
  → [changed] ACCENT_DOT: + amber entry
  → [changed] emoji set updated for all 7 providers

ApiKeySetupScreen.tsx
  → [added]   PROVIDER_INFO['bedrock'] with showModelPicker:true
  → [changed] PROVIDER_INFO['nova'] with showModelPicker:true, ABSK branding
  → [added]   COLOR_MAP['amber']
  → [added]   model picker <select> with <optgroup> per BEDROCK_GROUP
  → [changed] handleSave(): writes bedrock_model + selected_model when showModelPicker
  → [added]   imports: BEDROCK_MODELS, BEDROCK_DEFAULT_MODEL, BEDROCK_GROUPS, ChevronDown

SettingsScreen.tsx
  → [new]     PROVIDER_META record: all 8 providers with typed metadata
  → [new]     isBedrock / isGrok derived booleans
  → [new]     Bedrock Model picker <Section> rendered when isBedrock
  → [new]     handleBedrockModelChange() — live model switching without reload
  → [changed] displayModel: uses BEDROCK_MODELS lookup for friendly names
  → [changed] ImmersionToggle: w-12 h-7 track, translate-x-[22px]/[3px] knob,
              neon blue glow (shadow-[0_0_8px_rgba(59,130,246,0.5)]) when enabled
  → [added]   imports: BEDROCK_MODELS, BEDROCK_GROUPS, BEDROCK_DEFAULT_MODEL

App.tsx (GuardedRoutes)
  → [changed] API_KEY_PROVIDERS: + 'bedrock'
  → [fixed]   isProviderReady guard: /api-key-setup no longer triggers redirect
              (only / and /provider-select redirect to /novels when ready)

orchestrationService.ts
  → [changed] isLargeContextProvider(): + 'bedrock'
  → [fixed]   choice re-gen catch block: onError() → console.warn() (silent failure)

[NEW] .env.example (monorepo root)
  → documents: VITE_BEDROCK_API_KEY, VITE_GEMINI_API_KEY, VITE_GROK_API_KEY,
               VITE_OPENAI_API_KEY, VITE_HF_TOKEN, VITE_CLAUDE_API_KEY, VITE_DEEPSEEK_API_KEY

[NEW] artifacts/eden-novel/.env.example
  → same keys as root .env.example; placed in artifact dir for Vite env resolution
```

---

*Last updated: Bedrock integration + 24-item bug/feature batch complete. All new files and every changed file documented. TypeScript passes with zero errors.*

---

## Section 22 — Task #7: Settings & Provider UI Fixes (Version 5.0)

### Files Changed

#### `artifacts/eden-novel/src/screens/SettingsScreen.tsx`
- **Removed** `showAndroid` state and the entire "Export for Android" `<Section>` block (Capacitor APK instructions section removed from UI)
- **Removed** `ChevronDown`, `ChevronUp` imports (no longer needed)
- **Added** import of `modelService` singleton from `../services/modelService`
- **Fixed** `handleBedrockModelChange()`: now calls `modelService.selectBedrockModel(modelId)` instead of only writing to `localStorage` directly — triggers `notifyListeners()` so `ModelContext` re-renders immediately
- **Replaced** the old `ImmersionToggle` component with a proper `ToggleSwitch` sub-component:
  - Track: `h-6 w-11` rounded-full, `bg-blue-600` (on) / `bg-gray-700` (off)
  - Knob: `h-4 w-4` rounded-full white, `translate-x-6` (on) / `translate-x-1` (off)
  - Row layout: `flex items-center justify-between w-full py-3 px-4` with `flex-1 mr-4 min-w-0` label side and `flex-shrink-0` toggle side — knob never overflows its container
- **Removed** "Max tokens per scene" slider (`SET_MAX_TOKENS` dispatch)
- **Removed** "Temperature" slider (`SET_TEMPERATURE` dispatch)
- **Updated** auto-chapter slider: `min={1}` (was `min={5}`) so users can set "every 1 scene"
- **Fixed** test result banner: now shows exact latency ("Connected — response in Xms") and full error string ("Failed: [error message]")

#### `artifacts/eden-novel/src/context/AppContext.tsx`
- **Removed** `maxTokens: number` and `temperature: number` from `AppState` interface
- **Removed** `SET_MAX_TOKENS` and `SET_TEMPERATURE` from `AppAction` union
- **Removed** both fields from `defaultState`
- **Removed** both `case` handlers from the reducer
- **Added** migration in `loadSettings()`: strips `maxTokens` and `temperature` keys when reading from `localStorage` so existing saved settings don't cause type mismatches

#### `artifacts/eden-novel/src/screens/ApiKeySetupScreen.tsx`
- **Added** `isBedrockProvider` boolean (derived from `info.showModelPicker === true`)
- **Fixed** save button: `disabled={saving || (!isBedrockProvider && !key.trim())}` — Bedrock/Nova save button is always enabled regardless of whether the key field is empty
- **Fixed** `handleSave()`: guard `if (!isBedrockProvider && !key.trim())` instead of always blocking on empty key
- **Added** hint text for Bedrock providers: "Leave empty to use the `BEDROCK_API_KEY` environment variable."
- **Removed** the duplicate footer hint "Leave empty to use a key from the server environment." (replaced by in-card conditional hint)

#### `artifacts/eden-novel/src/services/modelService.ts`
- **Fixed** `testConnection()` for `grok`, `gemini`, `openai`, `claude`, `deepseek` providers: now makes a real minimal API request (1 token) instead of returning `{ success: true }` immediately based on key presence
  - Claude: `POST /v1/messages` with `max_tokens: 1`
  - OpenAI-compatible (grok, gemini, openai, deepseek): `POST /v1/chat/completions` with `max_tokens: 1, stream: false`
  - 15-second timeout via `AbortSignal.timeout(15000)`
  - Parses error JSON for provider-specific error messages (e.g. "401: Invalid API key")
  - Updates `isConnected` and `connectionError` fields and calls `notifyListeners()` on all paths

#### `artifacts/eden-novel/src/screens/StoryScreen.tsx`
- **Fixed** two call sites that referenced `settings.maxTokens` and `settings.temperature` (removed from AppContext) — replaced with hardcoded values `600` and `0.7` matching the orchestration engine defaults

### TypeScript Status
`pnpm run typecheck` — **0 errors** after all changes.

### Values Hardcoded (not user-configurable)
- `maxTokens`: 600 (passed directly in StoryScreen and orchestrationService)
- `temperature`: 0.7 (passed directly in StoryScreen and orchestrationService)

---

## Section 23 — Task #8: Story Flow, Chapter System & Bubble Animation

### Overview
Five interconnected improvements: staggered bubble animation with typing indicators, correct auto-chapter trigger using the user-configured threshold, inline ChapterTransitionCard with AI-generated title, full ChapterHistoryScreen redesign with List/Arc views, and choice persistence across restarts.

### Changed Files

#### `artifacts/eden-novel/src/context/StoryContext.tsx`
- **Added** `isShowingTyping: boolean` to `StoryState` (tracks per-bubble typing indicator state)
- **Added** `isChapterTransition?: boolean` and `chapterTransitionData?: { completedChapter, newChapter, newChapterId, title }` fields to `Bubble` interface
- **Added** `SET_TYPING` action → sets `isShowingTyping: true`
- **Added** `CLEAR_TYPING` action → sets `isShowingTyping: false`
- **Added** `REMOVE_BUBBLE` action → filters bubble by id from the list
- **Added** `RESET_ACTION_COUNT` action → resets `actionCount` to 0 (semantic alias for `SET_ACTION_COUNT` with n=0)
- All new cases handled in reducer

#### `artifacts/eden-novel/src/services/chapterService.ts`
- **Updated** `closeChapterAndBeginNext()` return type: now returns `{ closedChapterId, newChapterId, title }` (added `title` so callers don't need a second DB fetch to display the chapter title)

#### `artifacts/eden-novel/src/services/companionNarratorService.ts` *(new file)*
- **Created** stub service with `enqueueBubble(bubble: Bubble): void` no-op
- Wired into `addBubble` so every bubble dispatched in StoryScreen automatically flows through this hook; full implementation deferred to Task #9

#### `artifacts/eden-novel/src/screens/StoryScreen.tsx`
- **Added** import for `companionNarratorService`
- **Updated** `addBubble` helper: constructs `Bubble` object first, dispatches `ADD_BUBBLE`, then calls `companionNarratorService.enqueueBubble(b)` — all bubble additions now feed the narrator service
- **Seeded** `actionCount` on mount: `dispatch({ type: 'SET_ACTION_COUNT', n: n.action_count ?? 0 })` immediately after `loadNovel()` so restarts resume at the correct count
- **Added** choice restoration on mount: reads `eden_last_choices_${novelId}` from localStorage after bubbles load and re-dispatches `SET_INTERACTION` with saved choices+mode
- **Added** `sleep(ms)` helper (module-level arrow fn returning `Promise<void>`)
- **Added** `renderBubblesSequentially()` useCallback: replaces synchronous loop; for each bubble shows `SET_TYPING`, waits 600–1800 ms random typing delay, dispatches `CLEAR_TYPING`, calls `addBubble`, then waits `settings.bubbleDelay` and scrolls to bottom
- **Updated** `processParsedOutput()`: replaced the `for` loop over bubbles with `await renderBubblesSequentially(rawBubbles, chars, mcName)`; added localStorage persistence of choices (`eden_last_choices_${novelId}`) whenever `SET_INTERACTION` is dispatched with choices
- **Fixed** auto-chapter trigger: `if (newCount >= 20)` → `if (newCount >= settings.autoChapterEvery)` (respects the user's configured setting; default 10)
- **Updated** chapter completion: replaced narrator text bubble with `isChapterTransition: true` bubble carrying `chapterTransitionData`; uses `title` returned from `closeChapterAndBeginNext()`; dispatches `RESET_ACTION_COUNT` instead of `SET_ACTION_COUNT n:0`
- **Added** `try { localStorage.removeItem(...) }` at start of `handleAction` to clear choice persistence on every new action
- **Added** `handleNextChapterStart(transitionBubbleId)` useCallback: dispatches `REMOVE_BUBBLE`, then calls `handleAction('[chapter_start]')`
- **Added** `ChapterTransitionCard` component (module-level, before `StoryScreen`): renders inline in bubble list with chapter number, AI title, "Ask Eden" button (opens eden panel), and "Chapter N →" button
- **Updated** bubble map: handles `b.isChapterTransition` to render `ChapterTransitionCard` before other bubble types
- **Updated** typing indicator condition: `(state.isShowingTyping || (state.isGenerating && !state.streamingText))`

#### `artifacts/eden-novel/src/screens/ChapterHistoryScreen.tsx`
- **Full redesign**: List/Arc (Category) toggle in header; loads chapters with scene counts in parallel on mount
- **List view**: chapters in reverse order, each card shows number, title, 2-line summary, date, scene count, Read + Branch buttons
- **Arc view**: chapters grouped in blocks of 5 (Arc 1 = Ch1–5, etc.) with arc label headers
- **AI title generation on demand**: chapters with placeholder titles (`Chapter N`, `Prologue`, `In progress...`) show a wand icon button that calls `generateChapterTitle()` and saves via `updateChapter()` in-place
- **Skeleton loader** state per chapter entry (`generatingTitle` field)
- **Read button**: navigates to `/story/${novelId}`
- **Branch button**: disabled with `title="coming soon"` tooltip

---

### Session — May 17 2026 (Narrator TTS Play/Stop)

#### `artifacts/eden-novel/src/services/companionNarratorService.ts` *(rewritten)*
- **Switched TTS engine** from server-side `edge-tts` npm (403-blocked by Microsoft on cloud IPs) to browser-native **`window.speechSynthesis` (Web Speech API)** — runs locally in Chrome/Edge, no server hop, same Microsoft Neural voice names (Aria, Guy, Sonia, Ryan, Natasha, Emily).
- **Added** `langHint` field to `NarratorVoice` interface for voice resolution.
- **Added** `pickVoice(voiceId)` — resolves the best `SpeechSynthesisVoice`: (1) exact Microsoft Neural name match, (2) any voice with matching name fragment, (3) lang-code match, (4) any English voice.
- **Added** `speakUtterance(text, voiceId): Promise<void>` — handles async voice-list loading (Chrome loads voices lazily on first call); hooks `onstart/onend/onerror/onpause/onresume` to keep `_isPlaying` in sync and fire all listeners.
- **Added** listener pattern: `addListener`, `removeListener`, private `notify` — lets React components subscribe to play/pause state without polling.
- **Added** `isPlaying(): boolean` public getter.
- **Added** `pause()` — calls `synth.pause()`, sets `stopped = true`, fires listeners.
- **Added** `resume()` — calls `synth.resume()` if paused, or restarts queue processing if idle with pending items.
- **Added** `togglePlayPause()` — convenience wrapper used by the UI button.
- **Updated** `stopAll()` — calls `synth.cancel()` to immediately stop active utterance, clears queue, resets flags, fires listeners.
- **Updated** `previewVoice()` — uses `speakUtterance()` directly; cancels any in-progress audio before preview.
- **Removed** `API_BASE` and all `fetch()` calls — narrator no longer depends on api-server TTS.

#### `artifacts/eden-novel/src/screens/StoryScreen.tsx`
- **Added** imports: `Volume2`, `VolumeX` from `lucide-react`.
- **Added** `narratorPlaying` state: `useState(() => companionNarratorService.isPlaying())`.
- **Added** `useEffect` to subscribe/unsubscribe narrator service listener — syncs `narratorPlaying` on every state change.
- **Added** narrator play/pause button in top bar (right side, before Auto): visible only when narrator is enabled; amber + `VolumeX` when playing, dim + `Volume2` when stopped; calls `togglePlayPause()` on click.

#### `artifacts/eden-novel/src/screens/ApiKeySetupScreen.tsx`
- **Updated** Bedrock provider hint: now reads "Uses ABSK key auth · Region locked to us-east-1 · **Also covers Mistral (Voxtral, Ministral) models.**"

### TypeScript Status
`pnpm run typecheck` — **0 errors** after all changes.
