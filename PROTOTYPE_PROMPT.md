# EDEN NOVEL — FRONTEND PROTOTYPE PROMPT

Copy everything below the ▼ line and paste it into a fresh Claude conversation. The output is a complete, beautifully-animated frontend prototype that can be wired into the Eden Novel backend by swapping its mock adapter for the real services.

---

▼

You are building a complete frontend prototype for **EDEN NOVEL** — a dark anime interactive narrative app where the player lives inside a messenger-chat UI driven by AI. **Do not write any backend code.** Everything must run on mock data + a thin adapter interface so we can plug the real backend (already built) in by replacing one file later.

# 1. NON-NEGOTIABLE TECH STACK

Match this exactly — the existing backend project uses it, and the prototype must port cleanly.

- **React 19** (functional components + hooks only — no class components).
- **TypeScript 5.7+** with `strict: false`, `jsx: "react-jsx"`, target `ES2020`, `moduleResolution: "node"`.
- **Vite 7** as the build tool. Use `pnpm` if available; npm is acceptable.
- **Tailwind CSS v4** (`@tailwindcss/vite` plugin, `@import "tailwindcss"` in CSS). No `tailwind.config.js` required — v4 picks classes up automatically. Use arbitrary values freely.
- **Framer Motion v12** for ALL animations (`motion.div`, `AnimatePresence`, `layout`, `layoutId`, `useReducedMotion`).
- **Wouter v3** for routing (lightweight; matches the existing app). Routes: `/`, `/auth`, `/setup-model`, `/novels`, `/new-novel`, `/genre`, `/mc-setup`, `/story/:novelId`.
- **lucide-react** for icons.
- No Redux. Use React Context + `useReducer` for global state (story, model, app settings). Three Contexts: `ModelContext`, `AppContext`, `StoryContext`.
- **No backend calls.** All "AI" responses come from a `mockAdapter` module that returns pre-canned scenes / characters / choices with realistic latency (300-1200ms) and a token-by-token stream simulation using `async function*`.

# 2. VISUAL LANGUAGE

This is a **dark anime / Tokyo Ghoul / Attack on Titan** visual mood. Not playful. Not cartoonish. Not corporate.

## Palette
- Background base: `#0a0a0f` (near-black with a hint of indigo).
- Surface 1: `#12121a` (panels).
- Surface 2: `#1a1a26` (raised cards).
- Border: `rgba(255,255,255,0.06)`.
- Text primary: `#e6e6f0`.
- Text muted: `#7a7a8c`.
- Accent indigo: `#6366f1` (primary actions, MC).
- Accent rose: `#f43f5e` (danger, tension).
- Accent amber: `#f59e0b` (warnings, choice highlights).
- Accent emerald: `#10b981` (success).
- Subtle gradient overlays on every screen: `radial-gradient(at 30% 20%, rgba(99,102,241,0.08), transparent 60%), radial-gradient(at 70% 80%, rgba(244,63,94,0.06), transparent 60%)`.

## Typography
- Sans body: `Inter` (variable, weights 300–700).
- Display headings: `Cormorant Garamond` (serif, italic option) OR `EB Garamond` — chooses something with anime-light-novel feel.
- Mono accents (timestamps, NPC stats): `JetBrains Mono`.
- Narrator scene text: italic, slightly looser leading (`leading-7`).
- NPC dialogue bubble text: regular, slightly tighter (`leading-6`).

## Motion principles
- Default ease: `[0.22, 1, 0.36, 1]` (custom cubic-bezier — Apple-style spring-out).
- Page transitions: 280ms fade + 12px y-slide.
- Chat bubbles: stagger by 80-120ms, `initial: { opacity: 0, y: 8 }` -> `animate: { opacity: 1, y: 0 }`.
- Buttons: scale 0.97 on press.
- Tension bar / status meters: animate width with `transition: { duration: 0.7, ease: "easeOut" }`.
- Long-press / triple-tap reveals dev panels.
- `useReducedMotion()` guard: respect prefers-reduced-motion and disable layout-shifting animations.

## Texture
- Light noise overlay on the body (`bg-[url('/noise.svg')] opacity-[0.03] pointer-events-none fixed inset-0 z-50 mix-blend-overlay`).
- Subtle vignette behind panels (`shadow-[inset_0_0_120px_rgba(0,0,0,0.6)]`).
- Glass panels use `backdrop-blur-xl` + a 1px white-with-low-alpha border.

# 3. SCREENS — EVERY SCREEN, FULLY SPECIFIED

Build each screen as its own file under `src/screens/`. Use Wouter for routing.

## 3.1 `/` — SplashScreen

Boot screen. Auto-redirects after 1.6s to `/auth` (unless a user session exists in localStorage `eden_session`, in which case go to `/novels`).

- Centered, animated logo: a hand-drawn-feel "EDEN" wordmark with a slow ink-bloom mask reveal.
- Tagline beneath: *"A story that remembers you."*
- A subtle pulsing red dot in the corner (foreshadowing).
- Particle field of slow-drifting kanji-like glyphs in the background (Framer Motion + 12-15 stagger-animated divs with random rotation/translate).

## 3.2 `/auth` — Auth picker

Two giant clickable cards in a vertical stack on mobile (md: side-by-side):

1. **"Continue as guest"** — single tap → creates `eden_session = { id: 'guest-<uuid>', mode: 'guest', createdAt }` in localStorage → navigates to `/setup-model`.
2. **"Sign in with email"** — opens an inline email + password form (decorative only; on submit, mock for 800ms and save same session shape with `mode: 'authenticated'`).

Bottom of screen:
- Microcopy: *"Guest stories live on this device only. Sign in to sync."*
- A tiny "Why?" link that opens a Framer Motion drawer explaining what gets stored.

Visual flair:
- Each card is a glass panel with a subtle conic-gradient sweep on hover (CSS or animated background-position).
- An animated red glyph in the top-right corner of the guest card hints at danger.

## 3.3 `/setup-model` — Model picker

The user chooses an AI provider. List them as horizontally-scrollable cards (snap-x, no scrollbar) on mobile, grid on desktop.

Providers to include (all decorative, just UI):

| Provider | Tagline | Vibe color |
|---|---|---|
| `huggingface` | "Free models, BYO token" | gray |
| `grok` | "Largest context, dark-friendly" | violet |
| `gemini` | "Fast and broad" | sky |
| `openai` | "Polished prose" | emerald |
| `claude` | "Deepest character work" | amber |
| `deepseek` | "Cost-efficient" | teal |
| `bedrock` | "AWS Mistral/Nova" | orange |

Each card:
- Logo blob (use a `lucide-react` icon as a placeholder).
- Tagline.
- Pricing chip (e.g. "Free", "Pay-as-you-go").
- "Connect" button → opens a modal with an API key input + "Save" button. On save, store `{ provider, apiKey, savedAt }` in `eden_settings` localStorage and navigate to `/novels`.

A small "Skip — use mock AI" link at the bottom that bypasses everything and proceeds with a `mock` provider.

Animation: when the user taps a card, it expands to full-width with `layoutId` to morph into the API-key modal panel — feels like one continuous surface.

## 3.4 `/novels` — Home (novel list)

The home screen. Two states:

**Empty state:**
- Centered: an animated tarot-card-style "first story" prompt with a soft glow pulse.
- Big "Begin a new story" button → `/new-novel`.

**With novels:**
- Header: greeting ("Welcome back, traveler") + a settings gear icon.
- A horizontal "Continue" strip — large card for the most-recent novel showing genre badge, chapter, MC portrait, last-scene snippet (3 lines, fade-to-transparent).
- A grid below of all other novels — each card has portrait, title, genre, last-played-at, a tiny tension indicator bar.
- FAB ("+") bottom-right → `/new-novel`. The FAB pulses softly every 5s.

Long-press on a card opens a context menu (Framer Motion `AnimatePresence` modal): "Continue", "Rename", "Export", "Delete" (delete asks confirmation).

## 3.5 `/new-novel` — Novel creation wizard step 1: genre

A vertical scrollable list of genre cards. 20 genres (match the backend list):

`zombie, apocalypse, cultivation, cyberpunk, fantasy, mafia, romance, horror, detective, space_scifi, military_war, historical, survival, superpower, isekai, vampire, school, slice_of_life, thriller, crime_noir`

Each card:
- Genre title in serif italic.
- A mood line ("The infected roam. Every sound matters.").
- A representative gradient banner — each genre has its own color signature.
- Tap selects (radial ripple), tap again confirms and advances to MC setup.

Use `layoutId` for the selected card to expand into the next screen's hero section.

## 3.6 `/mc-setup` — MC creation wizard

Three substeps with a top progress bar (animated).

**Step A — Name & gender:**
- Name text input (autocompletes from a small placeholder list).
- Three gender pills: she/her, he/him, they/them.
- A "World name" optional field underneath.

**Step B — MC traits (single screen, no scroll on mobile):**
4 trait sliders, each labeled with two extreme adjectives at the ends. Slider value 0-100. Examples:
- Personality: `Cold` ↔ `Warm`
- Attitude: `Cautious` ↔ `Reckless`
- Altruism: `Self-serving` ↔ `Selfless`
- Risk tolerance: `Avoidant` ↔ `Pursuer`

The sliders update a live "MC summary" sentence underneath ("A cautious, warm protagonist who tends to protect others before themselves.") — make it reactive and well-written.

**Step C — Story hook:**
- A textarea labeled *"In one or two sentences, tell us where this story begins."*
- Below it, four chip-buttons that pre-fill seed templates ("A reborn villain", "The last living human", "A new transfer student", "Returned from war").
- A "Start the story" button at the bottom → creates a Novel via mock adapter → navigates to `/story/:novelId`.

Validation animations on each step (red shake if missing).

## 3.7 `/story/:novelId` — THE MAIN SCREEN

This is where 90% of the experience lives. **Spend the most time on this screen.** It is a messenger-chat UI.

Layout (mobile-first, with breakpoints for tablet/desktop):

```
┌────────────────────────────────────┐
│ Top bar: ← | Ch.1 — Prologue | ⚙ ▶ │  (chapter, location, autopilot toggle)
├────────────────────────────────────┤
│ Tension bar (3px, animated)        │  (only when tension > 40)
├────────────────────────────────────┤
│                                    │
│  Chat scroll area                  │
│  - environment hero card (top)     │
│  - narrator bubbles (italic, full width)
│  - NPC dialogue bubbles (left-aligned with portrait avatar)
│  - MC echo bubbles (right-aligned, accent indigo, no avatar)
│  - typing indicator while streaming
│  - environment-change banner cards
│  - chapter-end transition cards
│                                    │
├────────────────────────────────────┤
│ Choice rail (3 cards stacked)      │  (visible when interactionMode === 'decision')
│ /choice/ Press her for the truth ↗ │
│    └ "What do you mean by that?"   │  (faded italic — MC's spoken line)
│ /choice/ Stay silent and watch ↗   │
│    └ (silent)                      │
│ /choice/ Walk back to the door ↗   │
│    └ "I need air."                 │
├────────────────────────────────────┤
│ Custom-action input (paper-plane)  │
└────────────────────────────────────┘
```

### Side panels (slide-up sheets, Framer Motion `AnimatePresence`)

Triggered by a side-rail of vertical icons on the right edge (Users, Stats, World, Inventory, Notes). Each panel is a bottom-sheet on mobile / right-drawer on desktop.

**Characters panel:**
- Filter tabs: All / Alive / Dead.
- Each character row: portrait, name + role chip, current location chip.
- Below name: **EmotionBadge** — pill-shaped, color-coded by emotion, shows `Fearful (87%)`. Emotion → color map:
  - fearful/terrified → blue
  - furious/angry → red
  - grieving/sad → gray
  - hopeful/excited → yellow
  - conflicted/uncertain → purple
  - suspicious/guarded → orange
  - happy/content → green
  - tender → pink
  - ashamed → amber
  - desperate → deep-red
  - numb → slate
  - amused → cyan
  - neutral → gray-muted
- Tap to expand: shows Status, First-appeared, Introduced-y/n, Location, then three **mini-bars** for Trust / Affection / Respect (-100 to +100, color-coded), a `relationship_label` line, and a big "Relationship" bar.

**Stats panel:** MC's level, rank, XP, stat bars (STR/AGI/INT/CHA/etc — animated fills).

**World panel:** current location, time of day, day count, active threats (red pills), pending revelations, dramatic question (in italic serif).

**Inventory:** grid of item slots with a currency line at the top.

**Notes / Ask Eden:** a chat-style sub-panel where the player can ask "the engine" what's going on — purely mocked replies.

### Specific UX details

- **Streaming bubbles:** when a new scene streams in, render a single "streaming" bubble that progressively appends text. Use `useRef` for the text buffer. When the stream completes, call `parseBubbles(text, knownCharacterNames)` and *replace* the streaming bubble with the resulting array of individual bubbles, each staggered by 100ms.
- **Auto-scroll:** smoothly scroll to bottom whenever new bubbles arrive. If the user scrolls up, show a floating "↓ New" pill that snaps back when tapped.
- **NPC avatar:** use a generated SVG initial (first letter on a bubble-colored circle) since we have no real portrait assets in the prototype.
- **MC echo:** when the player taps a choice, the bubble appears INSTANTLY on the right side with `motion.div` `initial: { scale: 0.92, opacity: 0 }` -> `animate: { scale: 1, opacity: 1 }`. The MC's spoken line (from the `-> "..."` suffix) becomes the bubble content. If the suffix is empty, the bubble shows the choice label in muted italic.
- **Tension bar:** thin (3px) line below the top bar. Visible only when tension > 40. Colors: <60 amber, 60-80 orange, >80 red. Width animates to tension%. Pulses faster at higher values.
- **Auto-Pilot toggle:** ▶ icon in the top bar. When on, after each scene the prototype waits 2000ms then auto-picks a random choice (use the same UX the real engine will).
- **Triple-tap on the tension bar** (DEV mode only) opens a small "Scene Plan" overlay showing the mocked scene_type / required_elements / directive. This validates that the surface area exists for the real engine to feed data into.

# 4. PARSER & DATA SHAPES (CRITICAL — must match the real backend)

The prototype must use these exact shapes so the real backend slots in.

```ts
// src/types/index.ts

export type SceneType = 'action' | 'dialogue' | 'revelation' | 'quiet' | 'confrontation' | 'twist';

export interface Novel {
  id: number;
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
  mc_traits_json: string;     // JSON string of { personality, attitude, altruism, risk }
  starting_skills_json: string;
  action_count: number;
  starting_location?: string;
}

export interface Character {
  id?: number;
  novel_id: number;
  internal_uid: string;
  display_name: string;
  portrait_path: string;
  bubble_color: string;
  status: 'alive' | 'dead' | 'unknown';
  gender: string;
  role: 'protagonist' | 'antagonist' | 'ally' | 'mentor' | 'foil' | 'love-interest' | 'supporting' | 'npc';
  metadata_json: string;
  first_appeared_chapter: number;
  current_location: string;
  has_introduced_self: boolean;
  created_at: number;
  // v5 intelligence
  current_emotion?: string;
  emotion_intensity?: number;     // 0-100
  speech_style?: string;
  verbal_tics?: string;
  secret?: string;
  motivation?: string;
  fear?: string;
  relationship_label?: string;
  trust_level?: number;            // -100..100
  affection_level?: number;
  respect_level?: number;
}

export interface WorldState {
  genre: string;
  current_chapter: number;
  current_scene: number;
  current_location: string;
  time_of_day: string;
  day_number: number;
  weather: string;
  narrative_tension: number;       // 0-100
  story_momentum: number;
  dramatic_question: string;
  active_threats: string[];
  scene_type_history: SceneType[];
  pending_revelations: string[];
  chapter_goal: string;
  last_scene_summary: string;
}

export interface ParsedBubble {
  speaker?: string;
  content: string;
  isNarrator?: boolean;
}

export interface ChoiceOption {
  label: string;
  roleplayText?: string;          // "" allowed -> renders as "(silent)"
}

export interface ScenePlan {
  scene_type: SceneType;
  tension_target: number;
  directive: string;
  required_elements: string[];
  forbidden_elements: string[];
  npc_focus: string | null;
  dramatic_question_progress: string;
  foreshadow_hint: string | null;
}
```

## Parsing scene text

Implement `parseBubbles(text: string, knownNames: string[]): ParsedBubble[]` exactly as the backend does:

1. Lines beginning with `[Name]: "dialogue"` → dialogue bubble.
2. Lines beginning with `Name: "dialogue"` (no brackets) → dialogue bubble.
3. Lines beginning with `[Name] action` (no quotes) → speaker-prefixed bubble.
4. Lines with prose containing `"..."` AND either a known character name within 60 chars OR a speech verb (says/whispered/replied/muttered/snapped/exhaled/...) → split into narrator chunk + `[Name]: "..."` + trailing narrator chunk. If ambiguous, leave the quote in the narrator paragraph.

Implement `parseChoices(text)` that finds lines starting with `/choice/` and parses optional `-> "..."` roleplay suffix.

# 5. MOCK ADAPTER (the one swap point)

Create `src/services/mockAdapter.ts` that exports the same interface the real backend will:

```ts
export interface StoryAdapter {
  loadNovels(): Promise<Novel[]>;
  loadNovel(id: number): Promise<Novel>;
  loadCharacters(novelId: number): Promise<Character[]>;
  loadWorldState(novelId: number): Promise<WorldState>;
  createNovel(input: { genre: string; mc_name: string; world_name: string; story_seed: string; mc_traits_json: string; }): Promise<Novel>;
  generateOpeningStream(novelId: number, onToken: (t: string) => void): Promise<string>;
  generateNextSceneStream(args: {
    novelId: number;
    userAction: string;
    onToken: (t: string) => void;
    onScenePlan?: (plan: ScenePlan) => void;
  }): Promise<string>;
  refreshAfterScene(novelId: number): Promise<{ tension: number; characters: Character[]; ws: WorldState }>;
}
```

The mock implementation:
- Stores everything in `localStorage` keyed by novel id.
- Returns pre-canned scenes from a `mockScenes.ts` file with ~8 hand-written sample scenes per genre (cycle through them).
- Streams character-by-character with `await delay(8 + Math.random()*18)`.
- Generates mock characters with full v5 fields (emotions, speech_style, secret, trust_level, etc.) — feel free to make them dramatic; that's the point.
- Each pre-canned scene uses the correct `[Name]: "dialogue"` format and ends with three `/choice/ ... -> "..."` lines.
- Returns a mock `ScenePlan` per scene so the dev panel works.

**Important — the prototype must remain fully usable without any API keys.** All AI is mocked. The "model picker" screen is decorative.

# 6. FILE STRUCTURE

```
src/
  main.tsx
  App.tsx
  index.css                 (tailwind + base globals)
  router.tsx                (wouter routes)
  types/index.ts
  context/
    ModelContext.tsx
    AppContext.tsx
    StoryContext.tsx        (useReducer for bubbles, choices, isGenerating, interactionMode, ...)
  services/
    mockAdapter.ts          (the swap point)
    mockScenes.ts           (canned scenes per genre)
    parseBubbles.ts         (matches backend parser)
    parseChoices.ts
  components/
    common/
      AnimatedPanel.tsx
      Button.tsx
      Slider.tsx
      ProgressDots.tsx
    chat/
      MessageBubble.tsx
      NarratorBubble.tsx
      MCEchoBubble.tsx
      TypingIndicator.tsx
      EnvironmentBubble.tsx
      ChapterTransitionCard.tsx
      ScrollToBottomPill.tsx
    choice/
      ChoiceButton.tsx      ({ text, roleplayText, index, onClick }) — roleplay "" -> "(silent)"
      CustomActionInput.tsx
    badges/
      EmotionBadge.tsx
      TensionBar.tsx
      MiniBar.tsx           (trust/affection/respect, -100..100)
  panels/
    CharacterPanel.tsx
    StatusPanel.tsx
    WorldPanel.tsx
    InventoryPanel.tsx
    AskEdenPanel.tsx
  screens/
    SplashScreen.tsx
    AuthScreen.tsx
    ModelSetupScreen.tsx
    NovelsScreen.tsx
    NewNovelScreen.tsx          (genre)
    MCSetupScreen.tsx           (3 substeps)
    StoryScreen.tsx
  overlays/
    LevelUpOverlay.tsx          (purely cosmetic)
    SkillTreeOverlay.tsx
```

# 7. DELIVERABLES

Produce ALL of the following. Don't ask questions; make tasteful decisions and ship.

1. `package.json` with the exact deps + scripts (`dev`, `build`, `preview`, `typecheck`).
2. `vite.config.ts` with the Tailwind v4 plugin.
3. `tsconfig.json` with strict false and `jsx: "react-jsx"`.
4. `index.html` with `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Cormorant+Garamond:ital@0;1&family=JetBrains+Mono&display=swap" />` and a tiny inline `noscript` warning.
5. `src/index.css` with `@import "tailwindcss";`, custom CSS variables for the palette, the noise overlay class, the vignette utility, font-face uses.
6. Every file listed in section 6 — fully implemented, not stubs.
7. Two hand-written pre-canned scenes per genre in `mockScenes.ts` (so 40 total). Make them dramatically interesting — characters with secrets, subtext, NPC emotion shifts.
8. A `README.md` with `pnpm install && pnpm dev` instructions and a clear "WHERE TO PLUG THE REAL BACKEND" section pointing to `mockAdapter.ts`.

# 8. PORTABILITY CHECKLIST (this is why we built it this way)

When we port the prototype into the real Eden Novel codebase, ONE file changes:

- `src/services/mockAdapter.ts` is replaced by an adapter that calls the real services (`orchestrationService.generateNextScene`, `worldStateService.loadWorldState`, `characterDB.getCharactersByNovel`, etc.).
- All screens, components, types, parsers, contexts stay exactly as the prototype shipped them.

To make that swap safe:

- Use the exact `Novel` / `Character` / `WorldState` / `ParsedBubble` / `ChoiceOption` / `ScenePlan` shapes from section 4. Do NOT extend or rename them.
- Use the exact emotion vocabulary in `EmotionBadge`: fearful, terrified, furious, angry, grieving, sad, hopeful, excited, conflicted, uncertain, suspicious, guarded, happy, content, tender, ashamed, desperate, numb, amused, neutral.
- Render `(silent)` for empty roleplayText choices.
- Pass `knownNames` (= alive non-MC character display names) into `parseBubbles()` so the runtime inline-dialogue splitter works.
- Surface `onScenePlan` callback on the scene-stream call — the real backend already fires it.
- Tension bar reads from `WorldState.narrative_tension` (0-100) — visible only above 40.

# 9. VIBE / DETAILS THAT MATTER

- Every button has hover + active feedback.
- Every panel has an entry stagger.
- The chat scroll has a faint gradient mask at top + bottom (`mask-image`).
- Numbers (level, day, trust) tick up with a count-up animation when they change.
- Empty states have personality — never just "Nothing here".
- Errors are styled as little blood-red folded notes that drift in from below.
- The Auto button glows softly when active.
- The custom-action input has a placeholder that cycles every 6s through 5-6 evocative prompts ("What do you want to do?", "Speak", "Stay silent", "Step forward...", "Listen", "Walk away").
- The custom-action input's send button morphs into a small pulsing ring while generating.

# 10. WHAT NOT TO DO

- Do NOT use any backend / server / API calls. The mock adapter is the only data source.
- Do NOT use Redux, Zustand, Jotai, or any other state library. React Context + useReducer only.
- Do NOT use shadcn/ui, Radix, or HeroUI. Build the components yourself with Tailwind + Framer Motion.
- Do NOT use Next.js, Remix, or any framework. Plain Vite + React.
- Do NOT use class components.
- Do NOT add a settings page right now — focus on getting the core flow gorgeous.
- Do NOT make the UI feel "AI-generated default". Every screen should feel hand-curated. Dark anime energy throughout.

Begin. Output every file. Make it stunning.

▲

---

# HOW TO USE THIS PROMPT

1. Open a fresh Claude conversation (don't reuse this one).
2. Paste everything between ▼ and ▲.
3. Claude will output the full prototype.
4. Save the files locally and run `pnpm install && pnpm dev`.
5. When you're happy with the UI, drop the prototype into this repo under `artifacts/eden-novel-prototype/` and replace `src/services/mockAdapter.ts` with an adapter that imports the real backend services (`orchestrationService`, `worldStateService`, `characterDB`, etc.).

The shapes in section 4 and the parser contract in section 4-5 are deliberately chosen so the swap is one file — the rest of the UI stays exactly as the prototype was built.
