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
| Nova | `amazon.nova-2-sonic-v1:0` | `/nova/generate` (local backend proxy) | `bedrock_api_key` in localStorage → `BEDROCK_API_KEY` env/secret |

**Key methods:**
- `generateStream(systemPrompt, userPrompt, options)` — async generator, yields tokens as they arrive via SSE. Routes to the correct private stream method based on current provider.
- `generateText(systemPrompt, userPrompt, options)` — non-streaming, returns full text. Used for chapter titles, summaries, skill generation.
- `getProvider()` — reads from `localStorage('ai_provider')`
- `isProviderReady()` — returns true if the current provider has all required credentials
- `addListener(fn)` / `notifyListeners()` — pub/sub for React context to re-render on provider change

**Streaming mechanism:**
All providers except Claude and Nova use `_openAICompatStream()`, which POSTs to `/chat/completions` with `stream: true` and reads the SSE response via `_readSSEStream()`. Claude uses a separate `_claudeStream()` that handles Anthropic's different SSE format (`content_block_delta` events instead of OpenAI-style `choices[0].delta.content`). Gemini and OpenAI both have model fallback logic in case the primary model returns 404.

Nova uses `_novaStream()` which:
1. Reads `bedrock_api_key` from localStorage
2. Syncs the key to the local `nova-server.js` via `/nova/set-key` (handles server restarts)
3. POSTs to `/nova/generate` (proxied by Vite to `localhost:3001`)
4. Reads SSE tokens via `_readSSEStreamWithErrors()` — same `choices[0].delta.content` format as OpenAI, but with error propagation for Bedrock auth failures

Large-context providers are detected by:
```typescript
const isLargeContextProvider = () => {
  const p = modelService.getProvider();
  return p === 'grok' || p === 'gemini' || p === 'openai' || p === 'claude' || p === 'deepseek' || p === 'nova';
};
```
When `isLargeContextProvider()` is true, `buildFullGrokContext()` is used and `maxTokens` is 2000. When false (HuggingFace only), curated context is used and `maxTokens` defaults to 600.

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
