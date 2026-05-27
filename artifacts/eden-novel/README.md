# EDEN NOVEL — Frontend Prototype

A dark anime interactive narrative app. Messenger-chat UI driven by a mock AI adapter that streams scene text, manages character state, and presents choices.

---

## Quick Start

```bash
cd prototype
pnpm install     # or: npm install
pnpm dev         # or: npm run dev
```

Open **http://localhost:5173** in your browser.

Other commands:
```bash
pnpm build       # production build
pnpm preview     # preview the build
pnpm typecheck   # TypeScript check without building
```

---

## WHERE TO PLUG THE REAL BACKEND

**One file changes: `src/services/mockAdapter.ts`**

The real adapter must export the same `StoryAdapter` interface:

```ts
export interface StoryAdapter {
  loadNovels(): Promise<Novel[]>
  loadNovel(id: number): Promise<Novel>
  loadCharacters(novelId: number): Promise<Character[]>
  loadWorldState(novelId: number): Promise<WorldState>
  createNovel(input: { ... }): Promise<Novel>
  generateOpeningStream(novelId: number, onToken: (t: string) => void): Promise<string>
  generateNextSceneStream(args: {
    novelId: number
    userAction: string
    onToken: (t: string) => void
    onScenePlan?: (plan: ScenePlan) => void
  }): Promise<string>
  refreshAfterScene(novelId: number): Promise<{ tension: number; characters: Character[]; ws: WorldState }>
}
```

Then replace the `export const adapter` at the bottom of `mockAdapter.ts` with your real implementation:

```ts
// mockAdapter.ts — swap this line only:
export const adapter: StoryAdapter = new MockAdapter()

// → becomes:
export const adapter: StoryAdapter = new RealAdapter(config)
```

**What stays identical (do not change):**
- All screens, components, contexts, parsers
- The `Novel`, `Character`, `WorldState`, `ParsedBubble`, `ChoiceOption`, `ScenePlan` types in `src/types/index.ts`
- Scene text format: `[Name]: "dialogue"` + `/choice/ ... -> "..."`
- The `parseBubbles()` and `parseChoices()` functions

---

## Project Structure

```
src/
  main.tsx            — React entry point
  App.tsx             — Context providers + router
  router.tsx          — Wouter routes with page transitions
  index.css           — Tailwind v4 + CSS variables + animations
  types/index.ts      — All domain types (must match backend exactly)
  context/
    ModelContext.tsx   — AI provider selection state
    AppContext.tsx     — Session, auto-pilot, dev mode
    StoryContext.tsx   — Chat items, choices, world state, characters
  services/
    mockAdapter.ts     — ← SWAP THIS for real backend
    mockScenes.ts      — 40 hand-written scenes (2 per genre × 20 genres)
    parseBubbles.ts    — Scene text → bubble array (matches backend parser)
    parseChoices.ts    — /choice/ line parser
  components/         — Reusable UI components
  panels/             — Slide-up info panels (Characters, World, etc.)
  screens/            — One file per route
  overlays/           — Full-screen overlays (LevelUp, SkillTree)
```

---

## Genre List

zombie · apocalypse · cultivation · cyberpunk · fantasy · mafia · romance · horror · detective · space_scifi · military_war · historical · survival · superpower · isekai · vampire · school · slice_of_life · thriller · crime_noir

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 19 |
| Build | Vite 6 |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion 11 |
| Routing | Wouter 3 |
| Icons | lucide-react |
| State | React Context + useReducer |

No Redux. No shadcn/ui. No Next.js. Pure Vite + React.
