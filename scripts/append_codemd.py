import pathlib

addition = r"""

---

## 18. v5 NPC INTELLIGENCE & STORY ENGINE OVERHAUL (Latest)

This section documents the massive overhaul shipped on the `Eden Novel NPC intelligence & story engine overhaul` commit. It transforms the engine from generic flat AI output into a living narrative engine with NPC personality, emotional continuity, dramatic momentum, and purposeful scene planning. All changes are additive and backward-compatible: existing stories migrate on first load.

### 18.1 Database - `artifacts/eden-novel/src/database/db.ts` (v5)

**New character fields** (all optional; backfilled by the v5 upgrade):

| Field | Type | Purpose |
|---|---|---|
| `current_emotion` | string | e.g. `fearful`, `grieving`, `furious`, `conflicted` |
| `emotion_intensity` | number | 0-100 |
| `emotional_history` | string (JSON) | Last 5 `{ emotion, intensity, ts }` entries |
| `speech_style` | string | terse / verbose / cryptic / warm / cold / sarcastic / formal / erratic |
| `verbal_tics` | string | 1-2 sentence behavioral pattern |
| `secret` | string | Hidden truth this character is concealing |
| `motivation` | string | What this character actually wants |
| `fear` | string | Their deepest fear |
| `known_facts` | string (JSON) | What the NPC knows about world/plot |
| `ignorant_of` | string (JSON) | What they do not know yet |
| `last_seen_location` | string | For continuity tracking |
| `last_interaction_scene` | number | Scene number of last MC interaction |
| `relationship_label` | string | rival / mentor / love interest / etc. |
| `trust_level` | number | -100 to 100, toward MC |
| `affection_level` | number | -100 to 100, toward MC |
| `respect_level` | number | -100 to 100, toward MC |
| `current_agenda` | string | NPC short-term goal |

**New `npc_scene_log` table** - `++id, novel_id, character_uid, scene_number, created_at`. Stores per-NPC scene-by-scene history of emotion, action, dialogue excerpt, and relationship delta. Capped at 200 entries per novel.

**Migration:** v5 backfills all existing characters with `current_emotion='neutral'`, `emotion_intensity=50`, `trust/affection/respect=0`, and seeds all world_state JSON with `narrative_tension=20`, `story_momentum=30`, plus empty arrays for `active_threats`, `scene_type_history`, `pending_revelations`, `foreshadowed_events`, `npc_agenda_log`, and empty strings for `dramatic_question`, `chapter_goal`, `last_scene_summary`.

### 18.2 Character DB - `artifacts/eden-novel/src/database/characterDB.ts`

New exports (all clamp values; all safe to call on missing rows):

- `updateCharacterEmotion(uid, novelId, emotion, intensity)` - prepends to `emotional_history`, keeps last 5.
- `updateCharacterRelationshipMetrics(uid, novelId, trustDelta, affectionDelta, respectDelta)` - applies deltas clamped to -100/100.
- `getCharacterMentalState(uid, novelId)` -> `{ emotion, intensity, emotional_history, trust_level, affection_level, respect_level, motivation, fear, secret }`
- `logNpcSceneAction(novelId, characterUid, sceneNumber, emotion, action, dialogueExcerpt, relDelta)`
- `getNpcSceneLog(novelId, characterUid, limit=10)`
- `getCharacterVoiceProfile(uid, novelId)` -> `{ speech_style, verbal_tics, motivation, fear, secret, known_facts, ignorant_of }`
- `updateCharacterVoiceProfile(uid, novelId, profile)`
- `updateCharacterAgenda(uid, novelId, agenda)`
- `appendKnownFact(uid, novelId, fact)`
- `markSecretRevealed(uid, novelId)` - moves secret content into `known_facts` as `[revealed]`, clears the secret field.

### 18.3 World State Service - `artifacts/eden-novel/src/services/worldStateService.ts`

**New WorldStateData fields:**

```ts
narrative_tension: number;
story_momentum: number;
dramatic_question: string;
active_threats: string[];
scene_type_history: string[];
pending_revelations: string[];
chapter_goal: string;
foreshadowed_events: string[];
last_scene_summary: string;
npc_agenda_log: string[];
```

`loadWorldState()` now wraps the raw JSON in `withDramaticDefaults()` so any pre-v5 state still returns these fields.

**New helpers:** `updateNarrativeTension`, `adjustNarrativeTension`, `updateStoryMomentum`, `addToActiveThreats`, `removeFromActiveThreats`, `addToForeshadowedEvents`, `removeForeshadowedEvent`, `addPendingRevelation`, `consumePendingRevelation`, `updateChapterGoal`, `updateDramaticQuestion`, `updateLastSceneSummary`, `pushSceneTypeHistory` (capped at 5), `pushNpcAgendaLog` (capped at 15, ISO-stamped).

`buildContextSummary()` now also includes tension, momentum, dramatic question, chapter goal, and active threats.

### 18.4 New Service - `services/npcIntelligenceService.ts`

The core intelligence layer for NPC behavior.

**Exports:**

- `propagateEmotions(novelId, sceneText, presentCharacterUids, mcName)` - post-scene AI call. Asks the model to output `NAME|EMOTION|INTENSITY|REASON` per NPC; writes results via `updateCharacterEmotion` and logs via `logNpcSceneAction`. Fire-and-forget; silent on failure.
- `generateVoiceProfile(name, role, genre, storyContext)` -> `{ speech_style, verbal_tics, motivation, fear, secret }`. AI call with strict output format and a deterministic fallback.
- `ensureVoiceProfileForCharacter(novelId, uid, genre, storyContext)` - runs `generateVoiceProfile` only if the character lacks `speech_style/motivation/fear`. Persists via `updateCharacterVoiceProfile`. Used after `/new_char/` tags.
- `inferPresentNpcs(worldState, allCharacters)` - chooses up to 6 NPCs likely in the upcoming scene. Prefers `active_character_uids`, then co-located NPCs, then most recently interacted.
- `buildNpcContextBlock(characters)` - produces the `[CHARACTER PROFILES FOR THIS SCENE]` block injected into every scene prompt: Emotion, Trust, Affection, Motivation, Fear, Speech, Verbal tic, CONCEALING, Does not know.
- `formatNpcEmotionalStates(characters)` - compact one-line-per-NPC summary used by the pilot.
- `setNpcAgenda(novelId, uid, agenda)` - wrapper over `updateCharacterAgenda`.

### 18.5 New Service - `services/storyMomentumService.ts`

Drives narrative tension and scene-type rotation.

**Types:**

```ts
type SceneType = 'action' | 'dialogue' | 'revelation' | 'quiet' | 'confrontation' | 'twist';

interface ScenePlan {
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

**`planNextScene(novelId, timelineId, worldState, characters, lastAction, actionCount)`** - pure rule engine, no AI call. Selects scene type based on:

- tension >= 80 -> `twist` or `confrontation`
- tension <= 20 -> `quiet`
- actionCount % 5 === 0 -> `revelation`
- actionCount % 3 === 0 -> `dialogue` or `confrontation`
- last 3 same type -> force contrast
- otherwise default rhythm (35% dialogue / 30% action / 20% revelation / 15% confrontation)

Builds `required_elements` (e.g. "advance the dramatic question directly", "directly address the active threat", "let unresolved emotional weight surface in a small, physical detail") and `forbidden_elements` ("do not begin in {location} again", "no generic filler", "do not repeat the same scene structure as the last two scenes").

**`buildDramaticDirectiveBlock(plan, worldState)`** - formats the `[SCENE DIRECTIVE]` block injected into the user prompt.

**`updateMomentum(novelId, timelineId, sceneText, tagsResult)`** - fire-and-forget post-scene bookkeeping:

- Momentum delta from event-bearing tag count (+8/+4/-3).
- Tension drift if no explicit `/tension/` tag fired (+12 on death, -8 on chapter end, etc.).
- Pushes inferred scene type to history.
- Writes one-sentence `last_scene_summary`.

### 18.6 New Tags - `parsers/tagParser.ts`

| Tag | Effect |
|---|---|
| `/emotion_shift:uid:emotion:intensity/` | `updateCharacterEmotion()` |
| `/npc_agenda:uid:agenda text/` | `updateCharacterAgenda()` |
| `/secret_revealed:uid:secret/` | `markSecretRevealed()` |
| `/tension:N/` | `updateNarrativeTension(N)` (0-100) |
| `/revelation:text/` | `addPendingRevelation('[revealed] ' + text)` |
| `/foreshadow:text/` | `addToForeshadowedEvents()` |
| `/threat_add:description/` | `addToActiveThreats()` |
| `/threat_resolve:description/` | `removeFromActiveThreats()` |
| `/trust_shift:uid:delta/` | `updateCharacterRelationshipMetrics(uid, novelId, delta, 0, 0)` (clamped -25..+25) |
| `/dramatic_question:text/` | `updateDramaticQuestion()` |

**`parseBubbles()` is now smart-split:** It accepts:

1. `[Name]: "dialogue"` - explicit (preferred).
2. `Name: "dialogue"` - bracketless.
3. `[Name] action beat` - named action without quotes.
4. **Prose paragraphs containing inline quoted dialogue** - `splitInlineDialogue()` scans for `"..."` patterns and a speech verb (says/whispered/etc.) or a known character name in the surrounding 60 chars; if found, splits the line into a narrator chunk + a `[Name]: "..."` bubble + a trailing narrator chunk. This is a runtime defense for when the AI writes inline prose dialogue against the format rule.

`parseBubbles(text, knownCharacterNames?)` - new optional second arg; both `orchestrationService.applyParsedEffects()` and `StoryScreen.processParsedOutput()` now pass the alive non-MC character names.

### 18.7 Orchestration - `services/orchestrationService.ts`

**`generateNextScene` flow (v5):**

1. Load novel + world state + characters **in parallel**.
2. `storyMomentumService.planNextScene()` -> `ScenePlan`. Fires `callbacks.onScenePlan(plan)`.
3. `npcIntelligenceService.inferPresentNpcs(ws, characters)` -> present NPCs.
4. `npcIntelligenceService.buildNpcContextBlock(presentNpcs)` -> NPC block.
5. Build context (Grok/large: `buildFullGrokContext`, HF: memories + scenes).
6. `storyMomentumService.buildDramaticDirectiveBlock(plan, ws)` -> SCENE DIRECTIVE block.
7. Construct enriched user prompt with `[STORY CONTEXT]`, the NPC block, the SCENE DIRECTIVE, scene awareness, player action, and brutal ABSOLUTE FORMAT RULES (including correct/wrong inline-dialogue examples).
8. Stream AI tokens (`UPDATE_STREAMING` callback path unchanged).
9. **Fire-and-forget** after delivery:
   - `propagateEmotions(novelId, cleanText, presentNpcUids, mcName)`
   - `updateMomentum(novelId, timelineId, cleanText, parsed)`
10. Parse tags + apply side effects + new v5 tag wiring.
11. For `/new_char/` tags: fire-and-forget `ensureVoiceProfileForCharacter()`.
12. For `/relationship_update/` tags: also nudge `updateCharacterRelationshipMetrics`.

**`generateNovelOpening`** now additionally calls `seedOpeningDramaticState()`:

- AI generates a Chapter 1 dramatic question and saves to world state (`dramatic_question` + `chapter_goal`).
- AI generates 3 `pending_revelations` to be paid off later.

**New helper `applyV5Tags(novelId, parsed)`** - wraps each v5 tag side effect in try/catch so a single malformed tag cannot abort the pipeline.

**New callback** `onScenePlan?: (plan: ScenePlan) => void` on `GenerationCallbacks` - surfaces the plan to the UI for the DEV-only Scene Plan panel.

### 18.8 Preset System - `presets/`

**Complete rewrites:**

- `base_narrator.ts` - Forbids bland filler, demands sensory anchors, subtext, unexpected beats. Reinforces the messenger format rules.
- `messenger_bubble_ui.ts` - Brutal format rules. Spells out the parser failure mode (inline prose collapses to one italic block) so the AI internalizes why the format matters. Each line = one chat bubble. `/choice/ ... -> "..."` format with examples and counter-examples.
- `character_introduction_protocol.ts` - Physical entrance, sensory impression, first words reveal character, /new_char/ tag, naturalistic name reveal. Ongoing NPC rules tie behavior to speech_style / verbal_tics / motivation / secret.
- `world_state_persistence.ts` - Location memory, NPC offscreen lives, threat continuity, time awareness, consequence chain. Tag dictionary at the end.
- `mc_traits_system.ts` - Trait lenses for narrator POV. PERSONALITY / ATTITUDE / RISK TOLERANCE / ALTRUISM. Forbids tonal mismatch.
- `chapter_system.ts` - Setup -> Complication -> Escalation -> Cliffhanger. Pacing rules by scene index. `/chapter_end:true/` conditions. Never resolve all threads.
- `leveling_system.ts` - Level-ups are story moments. Skill names are crystallized lessons. NPCs notice growth.

**New presets:**

- `dramatic_tension_engine.ts` - Reading the tension level (0-20 calm, 21-40 dread, 41-60 conflict, 61-80 crisis, 81-100 breaking point). Prose tone matching. Tag tool descriptions. Rhythm rule.
- `npc_agenda_engine.ts` - NPCs actively pursue goals. Signs of agenda in dialogue. Relationship matrix by trust level. Affection x respect modulators. New v5 tag dictionary.

**All 20 genre files updated** with an NPC Archetype Library (psychologically rich 6-archetype catalog per genre): zombie, apocalypse, cultivation, cyberpunk, fantasy, mafia, romance, horror, detective, space_scifi, military_war, historical, survival, superpower, isekai, vampire, school, slice_of_life, thriller, crime_noir. Inserted via `scripts/append_archetypes.sh`.

### 18.9 `services/presetManager.ts`

**Updated `getGenreSystemPrompt(genre)` stack order:**

1. `base_narrator`
2. `{genre}_genre`
3. **`dramatic_tension_engine`** (NEW)
4. **`npc_agenda_engine`** (NEW)
5. `messenger_bubble_ui`
6. `scene_awareness_engine`
7. `world_state_persistence`
8. `chapter_system` (moved - now after world_state_persistence)
9. `character_introduction_protocol`
10. `character_metadata_expansion`
11. `leveling_system`
12. `mc_traits_system`
13. `story_seed_integration`
14. `story_opening_rules`
15. `starting_location`
16. `{genre}_opening_rules` (if exists)
17. `grok_content_policy` (if Grok)

**New method** `getSceneDirectivePrompt()` - stacks `dramatic_tension_engine + npc_agenda_engine + world_state_persistence`.

### 18.10 `services/grokContextBuilder.ts`

Adds two new sections to the full-context dump:

- `=== NPC EMOTIONAL STATES (CRITICAL - READ BEFORE WRITING) ===` - per-NPC line: Name | Emotion (intensity/100) | Trust MC | Motivation | Currently concealing. Max 8 NPCs.
- `=== NARRATIVE MOMENTUM ===` - Dramatic question, Narrative tension, Story momentum, Chapter goal, Active threats, Pending revelations (not yet revealed), Foreshadowed events (must be paid off), Last scene, Recent scene types.

Each character line in `ALL CHARACTERS` is unchanged; the new blocks are additive.

### 18.11 `services/memoryService.ts`

- `recordMemory()` now optionally takes `{ rawSceneText, tags }`. When `rawSceneText` is provided, calls `modelService.generateText()` to produce a 100-word vivid memory entry summary.
- Importance score derived from parsed tags: base 50, +20 level_up, +15 character_death, +10 relationship_update, +15 revelation, +10 chapter_end, +5 new_char, -10 if no event-bearing tags.
- Memory cap raised to 50.
- New `pruneAndCompressMemories()` archive strategy: keep score >=70; compress score 40-69 pairs into combined summaries; delete score <40.

### 18.12 `services/chapterService.ts`

- `generateChapterTitle()` now loads NPC emotions, dramatic question, chapter goal, active threats and prompts for an Attack-on-Titan-style evocative 5-word title. Strips quotes and markdown.
- `generateChapterSummary()` now prompts for a dark anime recap - central conflict, most significant moment, relationship shifts, what remains unresolved.
- **New `generateChapterGoal(novelId, timelineId, chapterNumber)`** - produces a single dramatic question starting with a verb. Persists to both `dramatic_question` and `chapter_goal` in world state. Called fire-and-forget from `closeChapterAndBeginNext()` after creating the new chapter.

### 18.13 `services/pilotService.ts`

**New `PilotStoryContext.novelId`** - when provided, the pilot loads world state and character emotional states and includes them in the decision prompt.

**New prompt structure:**

```
System: You are the strategic intelligence layer for an AI autopilot in a dark anime interactive novel. Your job is to choose the option that creates the MOST DRAMATICALLY INTERESTING next scene - not the safest option.

User: Genre / Narrative tension / Chapter goal / Active threats / Last scene / NPC emotional states / Dramatic question / Current arc / MC traits ...
Available choices: 0: ... 1: ... 2: ...
CHOOSE THE OPTION THAT: 1. Most directly engages with the highest-tension active element. 2. Creates an interesting complication. 3. Is consistent with MC traits.
Output ONLY a single digit (0 to N).
```

`maxTokens: 10, temperature: 0.6`. Defaults to 0 on parse failure.

### 18.14 UI Layer

**`screens/StoryScreen.tsx`:**

- New state `narrativeTension`, `lastScenePlan`, `showSceneDevPanel`.
- New `refreshNarrativeTension()` - called whenever `state.actionCount` or `state.currentChapter` changes.
- Thin animated tension bar (3px) **below the top bar**, visible only when `narrativeTension > 40`. Color tiers: <60 amber, 60-80 orange, >80 red. Width animates to `${narrativeTension}%`.
- Triple-tap on the tension bar toggles a DEV-only `Scene Plan` panel (only renders if `import.meta.env.DEV`).
- Pilot decision delay (sensitive tier) raised from 1500ms to 2000ms.
- `processParsedOutput` now passes `knownNames` to `parseBubbles()` for inline-dialogue splitting.
- `makePilotDecision()` call now passes `novelId` and `mcTraits` from the novel.

**`panels/CharacterPanel.tsx`:**

- New `EmotionBadge` component with a 20-emotion -> color palette map.
- Shows the badge under the character's name whenever the NPC has a current_emotion.
- New `MiniBar` component for compact Trust / Affection / Respect bars in the expanded card.
- Shows `relationship_label` line below the bars when present.

**`components/choice/ChoiceButton.tsx`:**

- When the roleplay text is an empty string (`""`), the UI now shows `(silent)` in faded italics instead of an empty quote pair.

### 18.15 New & Modified Files

```
NEW
artifacts/eden-novel/src/services/npcIntelligenceService.ts
artifacts/eden-novel/src/services/storyMomentumService.ts
artifacts/eden-novel/src/presets/dramatic_tension_engine.ts
artifacts/eden-novel/src/presets/npc_agenda_engine.ts
scripts/append_archetypes.sh

MODIFIED
artifacts/eden-novel/src/database/db.ts                       (v5 schema)
artifacts/eden-novel/src/database/characterDB.ts              (10 new fns)
artifacts/eden-novel/src/services/worldStateService.ts        (10 new helpers)
artifacts/eden-novel/src/services/orchestrationService.ts     (pipeline rewrite)
artifacts/eden-novel/src/services/memoryService.ts            (AI summary)
artifacts/eden-novel/src/services/chapterService.ts           (smarter chapter AI)
artifacts/eden-novel/src/services/pilotService.ts             (smarter prompt)
artifacts/eden-novel/src/services/grokContextBuilder.ts       (NPC + momentum sections)
artifacts/eden-novel/src/services/presetManager.ts            (new stack)
artifacts/eden-novel/src/parsers/tagParser.ts                 (10 tags + smart splitter)
artifacts/eden-novel/src/presets/base_narrator.ts             (rewrite)
artifacts/eden-novel/src/presets/messenger_bubble_ui.ts       (rewrite)
artifacts/eden-novel/src/presets/character_introduction_protocol.ts  (rewrite)
artifacts/eden-novel/src/presets/world_state_persistence.ts   (rewrite)
artifacts/eden-novel/src/presets/mc_traits_system.ts          (rewrite)
artifacts/eden-novel/src/presets/chapter_system.ts            (rewrite)
artifacts/eden-novel/src/presets/leveling_system.ts           (rewrite)
artifacts/eden-novel/src/presets/<20-genres>_genre.ts         (Archetype Library appended)
artifacts/eden-novel/src/screens/StoryScreen.tsx              (tension bar, scene plan, knownNames)
artifacts/eden-novel/src/panels/CharacterPanel.tsx            (emotion badge + bars)
artifacts/eden-novel/src/components/choice/ChoiceButton.tsx   (silent-choice fix)
```

### 18.16 Hot-Patch - Bland Output / Missing NPC Bubbles

After the initial v5 ship a real run revealed that Grok (and similar large-context models) sometimes write **prose paragraphs with inline quoted dialogue** instead of separate `[Name]: "..."` lines, which collapsed the messenger UI into one giant italic narrator block.

Two-layer fix:

1. **Stronger prompt** - `messenger_bubble_ui.ts` and `base_narrator.ts` now explicitly warn about this failure mode, include correct/wrong examples, and the orchestration user prompt repeats the format rules in every scene call with concrete BAD/GOOD examples.
2. **Runtime defense** - `parseBubbles()` now performs `splitInlineDialogue()` on any prose paragraph that contains quoted speech AND either a speech verb (`says`, `whispered`, `replied`, ...) or a known character name within the surrounding 60-char window. The result is a sequence of bubbles: narrator chunk -> `[Name]: "speech"` -> trailing narrator chunk. If attribution is ambiguous, the quote stays inside the narrator bubble so dialogue is never wrongly attributed.

The empty-roleplay choice (`/choice/ ... -> ""`) now renders as `(silent)` in `ChoiceButton.tsx` instead of empty quote marks.
"""

path = pathlib.Path(__file__).resolve().parent.parent / 'code.md'
text = path.read_text(encoding='utf-8')
if 'v5 NPC INTELLIGENCE & STORY ENGINE OVERHAUL' in text:
    raise SystemExit('section already present; skipping')
path.write_text(text + addition, encoding='utf-8')
print('appended', len(addition), 'chars to', path)
