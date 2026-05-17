# Eden Novel — AI-Powered Interactive Narrative Engine

> *Dark anime stories. Messenger-style chat. You control the protagonist. The AI controls everything else.*

---

## What Is Eden Novel?

Eden Novel is a fully offline, AI-powered interactive fiction engine built for the next generation of dark anime storytelling. It's not a chatbot. It's not a visual novel. It's not a game in the traditional sense. It's something in between — a living narrative machine that generates a unique, personalized dark anime story around your choices, your character name, and your decisions, moment by moment, entirely on your device.

Imagine the story depth of a 40-episode anime series, the pacing tension of a thriller manga, and the personal investment of an RPG — funneled through a messenger-style chat interface that feels like you're watching events unfold through your phone's message feed. Every character speaks in their own bubble. Every action you take ripples through a persistent world. Every decision the AI makes is informed by everything that has ever happened in your story — from chapter one, all the way to now.

This is Eden Novel.

---

## The Core Philosophy

Most AI story apps are wrappers around a single chatbot prompt. You ask, it responds, you ask again. There's no state, no memory, no world, no consequence. The story forgets you existed five messages ago.

Eden Novel was designed from the ground up to solve this. The architecture is built around three non-negotiable principles:

**1. Persistence** — Everything that happens in your story is saved to an IndexedDB database on your device. Characters live or die. Relationships shift. Inventory accumulates. The world evolves. Nothing is ephemeral. Nothing is forgotten.

**2. Immersion** — The messenger-style chat bubble UI is not a gimmick. It creates a specific kind of reading rhythm — short, punchy exchanges, cinematic narrator breaks, multiple characters reacting to the same event — that mimics exactly how modern dark anime reads. You're not reading a wall of text. You're watching a scene play out line by line.

**3. Player Agency** — You never speak for your character automatically. You either pick from AI-generated choice buttons or type your own custom action. Every bubble you see from your character is something you chose. The AI controls every other voice in the world — NPCs, antagonists, allies, the narrator itself — but it never writes your lines.

---

## The Genre System — 20 Worlds, One Engine

Eden Novel ships with twenty handcrafted story genres, each backed by a dedicated AI prompt preset that defines the rules, tone, characters, and progression logic of that world:

| Genre | Tone |
|---|---|
| **Zombie Apocalypse** | Survival horror, resource scarcity, group dynamics |
| **Cultivation / Xianxia** | Ancient power hierarchies, qi cultivation, sect politics |
| **School Life** | Social drama, dark secrets, coming-of-age tension |
| **Cyberpunk** | Megacorp dystopia, netrunning, augmented identity |
| **Dark Fantasy** | Magic systems, monster hunting, cursed artifacts |
| **Mafia / Underworld** | Crime hierarchies, loyalty tests, bloody betrayals |
| **Romance (Dark)** | Obsessive relationships, emotional manipulation, forbidden bonds |
| **Horror** | Psychological dread, slow-burn terror, supernatural threats |
| **Detective / Noir** | Cold cases, moral ambiguity, investigative tension |
| **Space Sci-Fi** | Deep space exploration, alien contact, crew dynamics |
| **Military** | Chain of command, battlefield ethics, war's cost |
| **Apocalypse** | Societal collapse, faction warfare, survival ethics |
| **Historical** | Court intrigue, ancient power struggles, cultural immersion |
| **Survival** | Wilderness isolation, resource management, primal stakes |
| **Superpower** | Ability awakening, power rankings, tournament arcs |
| **Isekai** | Portal fantasy, world-building, reincarnation mechanics |
| **Vampire / Night Society** | Blood politics, eternal hierarchies, predator dynamics |
| **Slice of Life (Dark)** | Quiet dread, domestic horror, mundane turned sinister |
| **Thriller** | Paranoia, time pressure, cat-and-mouse tension |
| **Crime Noir** | Morally grey protagonists, seedy underworlds, twisted justice |

Each genre has two dedicated presets loaded at runtime: a `{genre}_genre.ts` that defines the world rules, tone, NPC archetypes, narrative conventions, and a genre-specific **Progression Enforcement** block that enforces location lock prevention, NPC stranger rules, and choice specificity for that genre; and a `{genre}_progression.ts` that defines how your character grows within that genre's specific power fantasy.

---

## The Preset System — How the AI Thinks

The single most important architectural decision in Eden Novel is the **preset stacking system**.

At any given moment, the AI doesn't just receive a single instruction. It receives a layered system prompt assembled from multiple `.ts` files, each contributing a specific layer of narrative logic. The stack order is fixed and mandatory:

```
1.  base_narrator.ts               — core storytelling rules, bubble format, MC protection,
                                     choice generation mandates, narrative quality rules
2.  messenger_bubble_ui.ts         — how dialogue should be structured visually
3.  scene_awareness_engine.ts      — scene progression, NPC introduction protocol, location
                                     tracking, choice momentum rules, narrator self-audit
4.  world_state_persistence.ts     — how to track and reference world changes
5.  character_introduction_protocol.ts — mandatory 4-step character introduction sequence,
                                     stranger protocol, no-silent-appearances rule
6.  character_metadata_expansion.ts — how to build and evolve character personalities
7.  leveling_system.ts             — when and how to trigger progression events
8.  mc_traits_system.ts            — how MC personality traits shape narration and choices
9.  {genre}_genre.ts               — genre-specific world rules, NPC archetypes, and
                                     genre Progression Enforcement block
10. story_seed_integration.ts      — how to honor the player's story hook
11. story_opening_rules.ts         — rules specific to novel opening scenes
12. starting_location.ts           — how to anchor the story to the chosen starting location
13. chapter_system.ts              — when and how to open and close chapters
    pilot_autopilot_decision.ts    — (Pilot Mode only) logic for autonomous decision-making
```

These presets are loaded at startup via Vite's `import.meta.glob()`, assembled into a dictionary by the PresetManager singleton, and then stacked and concatenated into a single system prompt at the moment of generation. The result is an AI that doesn't just "write a story" — it operates with a complete, coherent rulebook every single time it generates output.

The `base_narrator.ts` preset contains the most critical rule of the entire system: **the AI must never write dialogue for the player's character.** This is non-negotiable and enforced at the preset level, the orchestration prompt level, and the output parsing level — a triple-layer protection ensuring your character only ever says what you choose.

---

## The Scene Awareness Engine — Stories That Actually Move

The `scene_awareness_engine.ts` preset is the system that prevents Eden Novel from doing what most AI story engines do: getting stuck. Without explicit guidance, AI storytellers will loop forever in the same location, introduce characters without properly establishing them, and generate choices that all amount to variations of the same action.

The Scene Awareness Engine enforces the following rules on every single scene generation:

### The 3-Scene Rule
After 3 consecutive player actions in the same physical location, the AI **must** do one of: move the MC to a new location, advance time significantly, or introduce a major in-scene event that fundamentally changes the scene's status. The AI is explicitly forbidden from generating a 4th consecutive scene in the same place with no change.

### Choice Momentum Rule
At least one of the three choices generated per scene must be a scene-exit, location-change, or time-advance option. The AI is forbidden from generating three choices that are all reactions within the same frozen moment.

### NPC Introduction Protocol
Whenever a new character appears for the first time, the AI must: describe their physical appearance before naming them, have their name emerge naturally through dialogue, emit a `/new_char:Name|gender|role/` tag at the end of the scene, and include a choice option allowing the MC to ask who they are.

### Stranger Protocol
If the MC has been reborn, transported to another world, or is playing an Isekai story, **every** character is a stranger until introduced in-scene. The narrator reflects MC ignorance at all times. The system auto-detects this condition from the genre selection or story seed keywords and injects it into every scene's context.

### Choice Specificity
Generic choice archetypes are forbidden. "Confront him" → "Step forward and block his path to the door." "Run away" → "Bolt for the stairwell at the end of the corridor." Every choice must be specific to the exact moment, location, and people present.

### Narrator Self-Audit
Before finalizing any output, the AI must internally confirm a 12-point checklist: did the story move? Did new characters get proper introductions? Is at least one choice a scene-exit? Does the scene open with a sensory detail? Does it end on a beat? Is it at least 120 words? If any check fails, the AI rewrites that section before outputting.

---

## The Scene Awareness Context Injection

Beyond the system prompt, the Scene Awareness Engine is reinforced at the user prompt level. Before every player action is processed, the orchestration service injects a live context block:

```
=== SCENE AWARENESS CONTEXT ===
Current location: [live from world state]
Current time: [live from world state]
Scene count at this location: [tracked per location, resets on move]
Characters physically present: [active non-protagonist characters]
MC knowledge state: stranger-to-world | familiar-world
Unintroduced characters present: [characters not yet formally introduced]
Active tension level: [low | medium | high | critical]
=== END SCENE AWARENESS CONTEXT ===
```

This block is assembled from live IndexedDB data at generation time — not from memory or inference. The AI knows exactly how many scenes have passed at the current location. It knows which characters haven't been properly introduced yet. It knows if this is an isekai or reborn story. This is what makes the 3-Scene Rule actually enforceable.

---

## The Orchestration Engine — The Brain

Every time something happens in your story, it passes through `orchestrationService.ts` — the central brain of Eden Novel.

Here's what happens in the milliseconds between you pressing a choice button and the first word appearing on screen:

**1. Context Assembly**
The orchestrator pulls your current world state from IndexedDB. It fetches your recent memory fragments, active characters, and the last few scenes. It builds a rich context block — or, if you're using Grok, it builds a *complete* context block containing every chapter summary, every character, every relationship, every memory, every world event ever recorded in your story.

**2. Scene Awareness Context Assembly**
The orchestrator reads the live world state — current location, time of day, scene count at this location, tension level, unintroduced characters — and assembles the Scene Awareness Context block that is injected before the player action in every prompt.

**3. System Prompt Stacking**
The PresetManager assembles the layered system prompt from all applicable presets in fixed mandatory order, combining the base narrator logic, scene awareness engine, genre rules, and progression logic into one authoritative instruction set.

**4. Streaming Generation**
The combined prompt is sent to your chosen AI provider. The response streams back token by token via Server-Sent Events (SSE). As tokens arrive, they're displayed in a live preview bar at the top of the screen — a low-bandwidth "preview line" that lets you watch the AI think in real time.

**5. Tag Parsing**
Once generation completes, the raw output passes through `tagParser.ts`. The AI embeds machine-readable inline tags throughout its prose — `/level_up:true/`, `/new_char:Voss|male|antagonist/`, `/location_change:The Shattered District/`, `/choice/ Option A`, `/choice/ Option B` — and the parser strips these out, extracts their semantic meaning, and routes each event to the appropriate handler.

**6. World State Updates**
Every tag event updates the IndexedDB database: new characters are created, location changes are committed, scene count at location is incremented or reset, inventory items are added or removed, relationships shift, world events are logged. By the time the first bubble animates onto screen, the world has already been updated to reflect what the AI just decided happened.

**7. Scene Count Tracking**
After every scene, `incrementSceneCountAtLocation()` is called. If the location has changed since the last scene, `sceneCountAtLocation` resets to 1. If the location is the same, it increments. This counter is what the Scene Awareness Context reports to the AI, making the 3-Scene Rule mechanically enforceable.

**8. Bubble Rendering**
The parsed clean text is split into individual dialogue lines by `parseBubbles()`, which recognizes `[CharacterName]: "dialogue"` format and narrator prose. Each bubble is added to the story state with a configurable delay — creating that satisfying stagger effect where characters seem to type their responses one by one.

**9. Choice Presentation**
If the AI ended the scene with `/choice/` lines (which the base preset mandates), those choices appear as glowing choice buttons below the chat. If no choices were generated, a custom text input appears automatically so you can always act.

---

## The Database — Your Story Lives On Your Device

Eden Novel uses **Dexie.js** as an abstraction layer over the browser's IndexedDB. There's no server. There's no login. There's no cloud sync. Everything your story generates lives in a 13-table relational database on your device:

- **novels** — your created stories with MC name, world name, genre, story seed, and active timeline
- **chapters** — auto-generated chapter records with titles, summaries, and world/character snapshots
- **scenes** — every individual scene generated, raw output preserved
- **characters** — every NPC and character the AI has introduced, with role, status, gender, and freeform metadata
- **character_relationships** — a full relationship graph between characters, with numeric affinity values and typed relationship categories
- **world_state** — the living JSON document tracking current location, active arc, scene count, scene count at location, time of day, tension level, world events, emotional state, and whether the MC is a stranger to the world (`mcIsReborn`), plus 20+ other tracked fields
- **progression_data** — your character's level, rank, stats, unspent points, and active power path
- **skill_registry** — every skill your character has unlocked, with rarity tiers, effect descriptions, and evolution hints
- **skill_tree_nodes** — the branching skill tree structure per genre, tracking unlocked and hidden nodes
- **timelines** — branch records for alternate story paths, enabling parallel histories
- **memories** — importance-scored memory fragments extracted from scenes, used to build context without hitting token limits
- **inventory** — items and currency tracked per character, with full add/remove history
- **presets_registry** — metadata about loaded preset files for debugging and version tracking

### New World State Fields
Three fields were added to the world state JSON to power the Scene Awareness Engine:

| Field | Type | Default | Purpose |
|---|---|---|---|
| `sceneCountAtLocation` | number | 0 | Tracks consecutive scenes in the same location. Resets to 1 on location change. Powers the 3-Scene Rule. |
| `tensionLevel` | string | `"low"` | Current narrative tension. Injected into every scene context block. |
| `mcIsReborn` | boolean | auto-detected | True if genre is isekai or story seed contains reborn/transmigration keywords. Activates the Stranger Protocol in all scene generation. |

---

## The Dual AI Provider System

Eden Novel supports two AI backends, selectable at launch:

### HuggingFace (Open Source Models)
Connect using a free HuggingFace API token and choose from dozens of frontier open-source models via the HuggingFace Router — Llama 3.3 70B, Qwen 2.5, Mistral, DeepSeek, and more. The HuggingFace path uses a curated context window: the last 3 scenes, a memory summary, and world state highlights. This is the economical path — powerful enough for rich storytelling, with full model choice.

### Grok by xAI (Full Context Mode)
Select Grok and the entire dynamic changes. Grok's `grok-3-fast` model supports a 131,072-token context window — and Eden Novel uses every bit of it.

When you use Grok, the `buildFullGrokContext()` function runs before every scene generation. It queries IndexedDB and assembles a complete picture of your story:

- **Every chapter summary** — not just recent ones, all of them, in order
- **Every character** — full name, role, status, gender, and all metadata ever recorded
- **Every relationship** — the full affinity graph between all characters
- **Every memory** — sorted by importance score, all of them
- **World state JSON** — the complete document including all Scene Awareness fields
- **Progression data** — level, rank, stats, active path, unspent points
- **All skills** — every unlocked ability with descriptions and rarity
- **Inventory** — all items across all characters
- **Last 20 scenes** — raw output, up to 800 chars each

This context block is prepended to every generation prompt. The AI has perfect recall. It never forgets a character it introduced in chapter one. It never contradicts a location established three arcs ago. It never kills a character it already reported dead. The result is a fundamentally different quality of storytelling — one that feels authored, intentional, and continuous rather than procedurally improvised.

---

## The Progression System — Your Character Grows

Eden Novel is not just a story reader. It's a character growth engine.

Every genre defines a power progression system appropriate to its world. In Cultivation stories, your character advances through ancient ranks — Qi Condensation, Foundation Establishment, Core Formation, Nascent Soul. In Zombie Apocalypse, you track Survival Rating, Combat Efficiency, and Group Leadership. In Cyberpunk, you accumulate Neural Augmentation tiers and Netrunning capacity. In Superpower stories, you move through awakening stages and power classifications.

The AI is instructed to embed `/level_up:true/` tags at dramatically appropriate moments — not randomly, but when the story has earned it. A hard-fought battle won. A crucial secret uncovered. A personal sacrifice made. When the tag fires, Eden Novel:

1. Triggers a full-screen Level Up overlay with your new rank, stat allocation UI, and unlocked skills
2. Queries the AI to generate a new genre-appropriate skill based on your current power path and story context
3. Permanently records the level, stats, and skill to your progression database
4. Updates the world state to reflect your increased power standing

**Stat Allocation** — On level up, you receive unspent stat points. You choose where they go. Each genre has its own stat system with appropriate labels (STR/DEF/AGI/INT/CHR for fantasy; Netrunning/Hacking/Combat/Stealth for cyberpunk; Leadership/Survival/Combat/Medical for military). Your choices shape your character's actual capability in future scenes — the AI knows your stats and will reference them in generation.

**The Skill Tree** — Beyond individual skills, Eden Novel maintains a per-genre skill tree with branching paths. Each path represents a different power fantasy within the genre. The tree tracks locked, unlocked, and hidden nodes — hidden nodes only appear when the story's events have narratively unlocked the conditions to reveal them. Your progression is never just numerical. It's narrative.

---

## Pilot Mode — The AI That Plays With You

Pilot Mode is one of Eden Novel's most distinctive features. Toggle it on, and the AI takes the wheel — making story decisions on your behalf, choosing from the available choices at each decision point according to its understanding of your character's personality, the current emotional state of the world, and the genre's dramatic conventions.

Pilot Mode is not random. It uses a dedicated `pilotService` that sends the current story context, active choices, genre, arc, and emotional state to the AI and asks it to evaluate each option from the perspective of a thoughtful author — not just picking randomly, but constructing a dramatically coherent arc.

Pilot Mode can pause itself. If the AI detects a pivot moment — a betrayal, an irreversible moral choice, a character death decision — it will suspend Pilot Mode and flag the moment, surfacing a banner that reads: *"Pilot paused: this decision requires your input."* You retake control exactly where you need to.

This creates a genuinely novel reading mode: you can sit back and watch your story unfold like an anime episode, and only reach for the controls at the moments that matter most.

---

## Ask Eden — Your Story's Oracle

Every story accumulates lore faster than any reader can track. Ask Eden is the in-story AI assistant that knows your narrative inside and out.

Open the Ask Eden panel and ask anything: *"What's the deal with the warehouse from chapter 3?"*, *"Is Detective Voss an ally or a threat?"*, *"What were the exact words of the prophecy?"*, *"Why did the Architect disappear?"*

Eden's responses are informed by your actual story data — world state, memories, characters, and recent scenes — not hallucinated answers. It answers in character as your story's narrator, maintaining immersion while giving you the clarity you need to make informed decisions.

---

## The Chapter System — Narrative Architecture

Eden Novel automatically manages your story's chapter structure. The AI embeds `/chapter_end:true/` tags when it determines a narrative arc has concluded naturally — a story beat has landed, a conflict has resolved, a new situation is beginning.

When a chapter closes, Eden Novel:

1. Assigns the chapter a number and generates a title through a dedicated `chapter_generation` prompt
2. Creates a chapter summary through `chapter_summary` prompting — a compressed narrative record of what happened
3. Takes a snapshot of the current world state and character roster at that exact moment
4. Opens a new chapter in the database
5. Updates the chapter counter in the UI

This means your story isn't just a continuous stream of text. It's a structured document. You can navigate the Chapter History screen to review any previous chapter, read its summary, and understand how far you've come. The chapter snapshots also provide historical context for future scene generation — the AI can be told "in Chapter 4, the world state was X" and respond accordingly.

---

## Timeline Branching — Alternate Histories

Every story is one version of events. Eden Novel's Timeline Branching system lets you create alternate histories from any point in your story.

Branch a timeline from a specific chapter, give it a label, and that branch becomes its own story — preserving the parent's history up to the branch point but diverging from there. Your choices in one timeline never bleed into another. You can run multiple versions of your story simultaneously, exploring what would have happened if you'd made a different call at a critical moment.

The timeline system is native to the database schema — every scene, chapter, and memory record carries a `timeline_id` foreign key, ensuring perfect separation between branches.

---

## The Memory System — Intelligent Context Compression

One of the fundamental challenges of long-form AI storytelling is context window limits. You can't feed 40 chapters of raw text into every generation prompt.

Eden Novel solves this with a dedicated memory system. After every scene generation, the `memoryService` extracts a compressed 300-character summary of what just happened and stores it as a `Memory` record with:
- **Relevance tags** — genre, current arc, key characters, location
- **Importance score** — a numeric weight that determines how aggressively this memory is prioritized in future context

When building context for HuggingFace generation, the memory service queries the database and assembles the highest-importance memories relevant to the current arc and genre — fitting the richest possible context into the available token budget. For Grok, all memories are included without compression. Either way, the AI is never flying blind.

---

## The Character System — A Living Cast

Eden Novel doesn't just name characters. It builds them.

Every character introduced by the AI — through the `/new_char:Name|gender|role/` tag — is automatically created in the database with a full record. As the story progresses, characters accumulate:

- **Role classifications** — protagonist (always you), antagonist, ally, supporting, neutral, unknown
- **Status tracking** — alive, dead, missing, unknown
- **Relationship values** — numeric affinity scores between every character pair, updated in real time as the AI embeds `/relationship_update/` tags
- **Metadata JSON** — a freeform JSON object that can hold any character-specific data the AI or player assigns
- **Bubble colors** — each character gets an assigned color used for their chat bubble, creating visual distinction between voices
- **Introduction tracking** — every character carries a `has_introduced_self` flag. Characters who haven't been formally introduced are surfaced in the Scene Awareness Context so the AI knows to trigger the introduction protocol.

The Character Panel lets you view your full cast at any time — who's alive, who's dead, who's an ally, who's a threat. The relationships between characters are tracked numerically, so when an NPC who was an ally at value +80 slides to -20 after a betrayal, the AI knows that relationship has fundamentally changed.

---

## The UI — Designed for the Story, Not the App

Eden Novel's interface makes deliberate choices that prioritize narrative immersion over feature exposure.

**Messenger-style bubbles** are the primary UI pattern. Left-aligned bubbles for NPCs and narrator, right-aligned blue bubbles for your character's actions. Each character's bubble has a unique color accent derived from their profile, creating visual fingerprinting across long conversations. The narrator speaks in full-width italic prose cards — a distinct visual language that separates world-description from character speech.

**The streaming preview bar** appears at the top of the chat area during generation — a compact, italic, constantly-updating line of text showing the AI's last 120 characters of output. This gives you the satisfying experience of watching the AI think without cluttering your chat history with incomplete content.

**Slide-up panels** — Characters, Status, World State, Ask Eden, Inventory — appear as animated bottom sheets over the story, accessible via the bottom navigation tabs. They slide in with spring physics, sit on top of the narrative without replacing it, and slide back out cleanly. The story is always behind them, never fully obscured.

**The Level Up overlay** is a full-screen, cinematic experience — a dark backdrop with a glowing rank announcement, stat allocation UI, and skill unlock reveal. It's deliberately dramatic, because leveling up should feel like an event.

**Framer Motion** powers every animated transition in the system — bubble entry animations, panel slides, overlay fades, choice button stagger. The motion design follows a consistent language: things slide up from below, appear with slight spring, disappear with a gentle fade. Nothing snaps. Nothing jolts. The UI breathes.

---

## The Technical Architecture — Built to Last

Eden Novel is a purely client-side application. It requires no backend beyond the AI API calls. Everything else — storage, routing, state management, UI — lives in the browser.

**React 19 + Vite** — The fastest possible development and build pipeline, with hot module replacement during development and optimized ESM bundles for production.

**Wouter** — Minimal hash-based routing that works correctly within Vite's base path system without the complexity of React Router's history API. Every screen is a route. Navigation is instant.

**Tailwind CSS** — Utility-first styling with a custom color palette tuned for the dark anime aesthetic. No component library dependencies. Every visual element is hand-crafted from Tailwind utilities.

**Framer Motion** — The animation layer for every transition, overlay, and bubble entrance. Spring-physics based, GPU-accelerated, with zero layout thrash.

**Dexie.js** — The IndexedDB wrapper that makes structured database queries feel like async TypeScript. Thirteen tables, compound indexes, reactive hooks for live UI updates from database changes.

**TypeScript 5.9** — Strict mode throughout. Every service, every database type, every React component is fully typed. Zero implicit `any`. The codebase is a single, coherent type system from database schema to UI props.

**Zod** — Schema validation at system prompt construction time, ensuring preset outputs are structurally valid before being sent to the AI.

---

## What Makes Eden Novel Different

There are other AI story tools. There are chatbots you can roleplay with. There are visual novel engines and choose-your-own-adventure frameworks. None of them do what Eden Novel does, because none of them were built around the same set of architectural commitments:

**Preset-stacked prompts** mean the AI is always operating with a complete, layered rulebook — not a single system message. The difference in output quality between a flat prompt and a stacked preset system is the difference between a casual improviser and a seasoned showrunner.

**The Scene Awareness Engine** means stories actually move. The AI is mechanically prevented from looping in the same location. Every new character gets a proper physical introduction before their name is revealed. Choices are specific to the exact moment and location. The story advances in time and space, always.

**Scene count tracking** means the 3-Scene Rule has teeth. The system literally counts how many consecutive scenes have occurred at the current location and injects that number into every prompt. The AI cannot plausibly ignore it.

**Tag-based world state updates** mean every piece of narrative output has semantic side effects. The AI doesn't just write words — it signals game events that update your actual world database in real time.

**Full Grok context injection** means long stories don't degrade. Chapter 40 is as coherent as Chapter 1, because the AI sees everything.

**The MC protection system** means you always feel like a player, not a passive reader. The AI never takes your voice. Your character's decisions are yours, every time.

**Offline-first IndexedDB architecture** means your story is yours. No subscription. No sync. No privacy concerns. The database lives in your browser.

**20 genre presets** means Eden Novel isn't a generic story engine — it's twenty finely-tuned narrative machines in one, each with genre-appropriate progression, power systems, character archetypes, dramatic conventions, and progression enforcement rules baked in.

---

## The Vision

Eden Novel is what happens when you take AI seriously as a collaborative storytelling tool — not as a party trick or a novelty, but as a genuine creative partner that can maintain a fictional world across hundreds of scenes, evolve characters over dozens of chapters, and generate dramatically appropriate content within a specific genre's conventions, consistently, without losing the thread.

It's the anime you never got to finish. The manga arc that ended too soon. The RPG campaign with a story worth telling. It's yours, on your device, responsive to your choices, shaped by your character's name and the genre you love.

Eden Novel doesn't tell you a story. It builds one with you.

---

*Built with React, Vite, Dexie.js, Framer Motion, Tailwind CSS, and TypeScript. Powered by HuggingFace open-source models or Grok by xAI. Runs entirely in your browser.*
