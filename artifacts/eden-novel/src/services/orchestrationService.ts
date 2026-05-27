import { modelService } from './modelService';
import { presetManager } from './presetManager';
import {
  loadWorldState,
  buildContextSummary,
  incrementScene,
  incrementSceneCountAtLocation,
  addWorldEvent,
  updateWorldStateFields,
  addToActiveThreats,
  removeFromActiveThreats,
  addToForeshadowedEvents,
  addPendingRevelation,
  updateNarrativeTension,
  updateDramaticQuestion,
  updateChapterGoal,
} from './worldStateService';
import { buildMemoryContext, recordMemory } from './memoryService';
import { buildFullGrokContext } from './grokContextBuilder';
import { parseNarrativeTags, parseBubbles, extractSpeakerNames, TagParseResult } from '../parsers/tagParser';
import {
  getCharactersByNovel,
  createCharacter,
  updateCharacter,
  getCharacterByUid,
  updateRelationship,
  markCharacterIntroduced,
  updateCharacterEmotion,
  updateCharacterRelationshipMetrics,
  updateCharacterAgenda,
  markSecretRevealed,
} from '../database/characterDB';
import { addItem, removeItem } from '../database/inventoryDB';
import { getLastScenes } from '../database/sceneDB';
import { closeChapterAndBeginNext } from './chapterService';
import { triggerLevelUp } from './progressionService';
import { loadNovel } from './novelService';
import { assignPortrait } from './portraitService';
import type { LevelUpResult } from './progressionService';
import { buildOpeningSystemPrompt } from '../presets/novel_opening_engine';
import {
  planNextScene,
  buildDramaticDirectiveBlock,
  updateMomentum,
  type ScenePlan,
} from './storyMomentumService';
import {
  buildNpcContextBlock,
  inferPresentNpcs,
  propagateEmotions,
  ensureVoiceProfileForCharacter,
} from './npcIntelligenceService';


export interface GenerationCallbacks {
  onToken: (token: string) => void;
  onTagsParsed: (result: ReturnType<typeof parseNarrativeTags>) => void;
  onLevelUp: (result: LevelUpResult) => void;
  onChapterEnd: (chapterId: number) => void;
  onPilotPause: (reason: string) => void;
  onNewCharacter: (name: string) => void;
  onSkillUnlock: (skillName: string) => void;
  onError: (err: string) => void;
  onScenePlan?: (plan: ScenePlan) => void;
}

const isLargeContextProvider = () => {
  const p = modelService.getProvider();
  return p === 'grok' || p === 'gemini' || p === 'openai' || p === 'claude' || p === 'nova' || p === 'bedrock';
};

// ─── STORY FANTASY ANALYZER ──────────────────────────────────────────────────

export interface FantasyAnalysis {
  openingEnergy: 'explosive' | 'quiet' | 'mysterious' | 'tense' | 'tender';
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  playerExpectation: string;
  isRegression: boolean;
  isRevenge: boolean;
  isRomance: boolean;
  isSurvival: boolean;
  hasFutureEvent: boolean;
  timeBefore: string | null;
  futureEvent: string;
  openingBlock: string;
  fantasySummary: string;
}

export function storyFantasyAnalyzer(storySeed: string, genre: string, mcName: string): FantasyAnalysis {
  const hook = storySeed || '';
  const hookLower = hook.toLowerCase();

  const isRegression = /\b(reborn|rebirth|past life|previous life|died|perished|death|reincarn|transmigrat|regression|second chance|time travel|time-travel|woke up (?:in|as)|returned to|went back|once again)\b/.test(hookLower);
  const hasFutureEvent = /\b(before the|prior to|one month|two months|three months|a week|two weeks|\d+ (?:month|week|day|year)s? before|before it|before (?:everything|chaos|collapse|disaster|catastrophe|apocalypse|the war|the outbreak|the invasion))\b/.test(hookLower);
  const isRevenge = /\b(revenge|betray|justice|they will pay|kill them|make them|ruin|destroyed my|they killed|humiliat)\b/.test(hookLower);
  const isRomance = /\b(love|heart|crush|relationship|romantic|marriage|dating|beloved|she was|he was|feelings)\b/.test(hookLower) || genre === 'romance';
  const isSurvival = /\b(survive|survival|supplies|resources|shelter|food|water|escape|outlast)\b/.test(hookLower) || genre === 'survival' || genre === 'zombie' || genre === 'apocalypse';

  const timeBeforeMatch = hookLower.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a few|several)\s+(month|week|day|year)s?\s+before/);
  const timeBefore = timeBeforeMatch ? timeBeforeMatch[0] : null;

  const eventPatterns = [
    /\b(ice age|ice-age)\b/i, /\b(apocalypse|apocalyptic [a-z]+ [a-z]+)\b/i,
    /\b(zombie (?:outbreak|apocalypse|invasion))\b/i, /\b(catastroph[a-z]+)\b/i,
    /\b(collapse of [a-z ]+)\b/i, /\b(the (?:war|invasion|outbreak|disaster|calamity|crisis|event|incident))\b/i,
    /\b(meteor|comet|asteroid)\b/i, /\b(world (?:war|destruction|end))\b/i,
  ];
  let futureEvent = 'the catastrophic event';
  for (const pat of eventPatterns) {
    const m = hook.match(pat);
    if (m) { futureEvent = m[0]; break; }
  }

  const openingEnergy: FantasyAnalysis['openingEnergy'] =
    isRevenge ? 'tense' :
    isRomance ? 'tender' :
    isSurvival ? 'explosive' :
    isRegression ? 'quiet' :
    'mysterious';

  const urgencyLevel: FantasyAnalysis['urgencyLevel'] =
    isSurvival ? 'critical' :
    isRevenge ? 'high' :
    isRegression ? 'medium' :
    isRomance ? 'low' :
    'medium';

  const playerExpectation =
    isRegression ? `Second-chance: ${mcName} returns to change everything they lost` :
    isRevenge ? `Revenge arc: ${mcName} rises against those who wronged them` :
    isRomance ? `Emotional journey: ${mcName} discovers connection and vulnerability` :
    isSurvival ? `Fight to live: ${mcName} faces relentless danger with scarce resources` :
    `Discovery: ${mcName} navigates a ${genre} world full of unknown stakes`;

  let openingBlock = '';
  if (isRegression) {
    const timeStr = timeBefore ? `**${timeBefore}** — BEFORE ${futureEvent} occurs` : 'at the moment of rebirth/return to the past';
    openingBlock = `
━━━ HOOK TIMELINE ANALYSIS — YOU MUST FOLLOW THIS PRECISELY ━━━
The player's hook describes a REGRESSION / REBIRTH story.
◆ WHEN DOES THE STORY START:
  The story begins ${timeStr}.
${timeBefore ? `  → ${futureEvent.toUpperCase()} HAS NOT HAPPENED YET.\n  → The world is COMPLETELY NORMAL at story opening.` : '  → The MC has just been reborn / returned to the past.'}
◆ WHAT ${mcName.toUpperCase()} KNOWS (inner world, secret):
  → They remember their past life, their death, and everything that happened.
  → They KNOW what is coming.
◆ STRICTLY FORBIDDEN IN THE OPENING:
  ✗ DO NOT begin with ${futureEvent} already happening
  ✗ DO NOT show signs of disaster, chaos, or the event's effects
  ✗ DO NOT have other characters react to any disaster
  ✗ DO NOT skip past the rebirth moment
◆ WHAT THE OPENING MUST SHOW:
  ✓ ${mcName} waking up or becoming aware
  ✓ The shock/realization of being back
  ✓ Mundane details that contrast with what ${mcName} knows
  ✓ An NPC who appears completely normal
  ✓ ${mcName}'s urgency hidden from others
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  } else if (hook.trim()) {
    const toneGuide =
      openingEnergy === 'tense' ? 'Build immediate tension. Show the wound. No idle pleasantries.' :
      openingEnergy === 'tender' ? 'Open with warmth and emotional closeness. Small moments, real feelings.' :
      openingEnergy === 'explosive' ? 'Throw the MC into immediate danger or urgency. No slow build.' :
      openingEnergy === 'quiet' ? 'Open in a deceptively calm moment. The weight is internal.' :
      'Open with atmosphere and mystery. Something feels off or wondrous.';
    openingBlock = `
━━━ STORY FANTASY ANALYSIS — BEGIN HERE ━━━
The player's story hook: "${hook}"
Core fantasy: ${playerExpectation}
Opening energy: ${openingEnergy.toUpperCase()} — ${toneGuide}
Urgency level: ${urgencyLevel.toUpperCase()}
YOUR JOB: Begin the story at the VERY START. Don't summarize. BEGIN INSIDE IT.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  const fantasySummary = hook.trim()
    ? `[Story Core] MC: ${mcName} | Genre: ${genre} | Fantasy: ${playerExpectation} | Energy: ${openingEnergy} | Urgency: ${urgencyLevel}${isRegression ? ` | Regression story — world is currently normal, ${mcName} knows the future` : ''}${isRevenge ? ' | Revenge arc active' : ''}${isRomance ? ' | Romance thread running' : ''}${isSurvival ? ' | Survival pressure constant' : ''}`
    : '';

  return { openingEnergy, urgencyLevel, playerExpectation, isRegression, isRevenge, isRomance, isSurvival, hasFutureEvent, timeBefore, futureEvent, openingBlock, fantasySummary };
}

function extractRealNameFromIntroduction(dialogue: string): string | null {
  const patterns = [
    /(?:my name is|i am called|i'm called|call me|they call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:i'm|i am)\s+([A-Z][a-z]{1,}(?:\s+[A-Z][a-z]+)?)\b/,
    /\bname(?:'s| is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];
  for (const p of patterns) {
    const m = dialogue.match(p);
    if (m?.[1] && m[1].length >= 2 && !/^(the|a|an|he|she|it|we|they|you|and|or|but|in|on|at|to)$/i.test(m[1])) {
      return m[1].trim();
    }
  }
  return null;
}

function buildTimelineConstraint(hook: FantasyAnalysis, mcName: string): string {
  if (!hook.isRegression && !hook.hasFutureEvent) return '';
  const eventName = hook.futureEvent || 'the coming event';
  return `
══════════════════════════════════════════════════════════
CRITICAL TIMELINE CONSTRAINT — MUST OBEY EVERY SCENE:
══════════════════════════════════════════════════════════
The story is currently set ${hook.timeBefore ? hook.timeBefore + ' BEFORE' : 'BEFORE'} ${eventName}.
${eventName.toUpperCase()} HAS NOT HAPPENED YET. The world is still completely normal.
• Each player action = a few minutes to a few hours pass. NEVER days or months.
• NO signs of disaster, chaos, or the event's effects.
• NPCs are completely unaware of what is coming.
• ${mcName} privately knows the future — urgency is internal.
• DO NOT trigger, start, or hint at ${eventName} beginning yet.
• The story can only reach ${eventName} after many actions over many chapters.
══════════════════════════════════════════════════════════`;
}

// ─── STORY DRIFT / OFF-TOPIC TRACKING ─────────────────────────────────────────

function buildDriftRecoveryPrompt(genre: string, storySeed: string, driftCount: number): string {
  return `
⚠️ STORY DRIFT RECOVERY — PRIORITY OVERRIDE ⚠️
The narrative has drifted off-genre for ${driftCount} consecutive actions.
YOU MUST forcefully return the story to its ${genre.toUpperCase()} core focus.

Genre anchor: ${genre}
Story seed: ${storySeed || 'none'}

RECOVERY RULES:
1. IGNORE the player's off-topic action completely
2. Return to the LAST on-genre scene moment
3. Re-establish the core threat/conflict of ${genre} immediately
4. Use a narrator transition: "But the ${genre} world did not pause..."
5. Re-introduce the central genre elements within 2 bubbles
6. Make the MC feel the consequences of their distraction

END WITH /choice/ lines that are ALL grounded in the ${genre} reality.
`;
}

// ─── GENRE INTEGRITY PROMPT INJECTION ───────────────────────────────────────

function buildGenreIntegrityBlock(genre: string): string {
  return `
══════════════════════════════════════════════════════════
GENRE INTEGRITY — NON-NEGOTIABLE
══════════════════════════════════════════════════════════
Genre: ${genre.toUpperCase()}

You are writing a ${genre} story. These are the CORE ELEMENTS that must ALWAYS be present:
${getGenreCoreElements(genre)}

RULES:
• The ${genre} world continues to exist regardless of what the player does
• Even during character moments, the ${genre} threat/atmosphere is present
• Never let the story become a generic conversation — always tie back to ${genre}
• If the player does something off-genre, acknowledge it briefly, then PIVOT back to ${genre}
• The ${genre} setting is ALIVE — it changes, it reacts, it doesn't wait for the MC
══════════════════════════════════════════════════════════`;
}

function getGenreCoreElements(genre: string): string {
  const cores: Record<string, string> = {
    zombie: 'The infected roam. Every sound matters. Safe zones are fragile. Resources are scarce. Trust is dangerous.',
    cultivation: 'Spiritual energy flows through all things. Sect politics are deadly. Realms define power. Ancient secrets exist.',
    school: 'Social hierarchy is visible. Clubs have power. Teachers hide things. Rooftops hold secrets. The system is watching.',
    cyberpunk: 'Corporations own everything. Implants change humanity. The net is alive. Street level is brutal. Information is currency.',
    fantasy: 'Magic has rules and costs. Kingdoms scheme. Monsters exist. Legends are real. The world has depth.',
    mafia: 'Territory is blood. Loyalty is tested. The code exists. Violence is business. Family is everything.',
    romance: 'Emotions have weight. Connections matter. The past shapes the present. Vulnerability is strength.',
    horror: "Something is wrong. The rules don't apply here. Fear is physical. The threat is relentless.",
    detective: 'Cases have layers. Evidence lies. Everyone has secrets. The system is flawed. Truth is hard-won.',
    space_scifi: 'Space is vast and hostile. Technology has limits. Aliens exist. Resources are scarce. Distance changes everything.',
    military_war: 'Chain of command matters. Lives are on the line. Strategy versus survival. The enemy is real.',
    apocalypse: 'Civilization is gone. Hope is scarce. Groups form and fracture. The world is dangerous.',
    historical: 'Era defines behavior. Power is inherited. Tradition binds. Change is slow. Honor has weight.',
    survival: 'Nature is unforgiving. Skills matter. Resources are limited. The elements are real threats.',
    superpower: 'Power has consequences. Society reacts. Control is hard. Identity is questioned.',
    isekai: 'The world has its own rules. Adaptation is survival. The system exists. Home is distant.',
    vampire: 'Blood defines power. Night is domain. Humanity is prey. Ancient laws bind. Hunger is constant.',
    slice_of_life: 'Daily moments matter. Relationships grow slowly. Small events have weight. Time passes.',
    thriller: 'Tension is constant. The clock is ticking. Trust no one. Information is power. Stakes are high.',
    crime_noir: 'The city is corrupt. Everyone has an angle. Morality is gray. The truth costs.',
  };
  return cores[genre] ?? 'Maintain the core themes and atmosphere of the genre at all times.';
}

function parseChoicesFromText(text: string): string[] {
  const choices: string[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('/choice/')) {
      const content = trimmed.replace('/choice/', '').trim();
      if (content) {
        choices.push(content);
      }
    }
  }
  return choices;
}

export async function generateNextScene(
  novelId: number,
  timelineId: string,
  mcUid: string,
  mcName: string,
  genre: string,
  userAction: string,
  callbacks: GenerationCallbacks,
  maxTokens = 600,
  temperature = 0.7,
  offTopicCount = 0,
  lastChoices?: string[],
  dryRun = false,
): Promise<string> {
  const useLargeContext = isLargeContextProvider();

  // Load novel + world state + characters in parallel
  const [novel, ws, characters] = await Promise.all([
    loadNovel(novelId),
    loadWorldState(novelId),
    getCharactersByNovel(novelId),
  ]);

  const storySeed = novel?.story_seed ?? '';
  const startingLocation = novel?.starting_location ?? '';
  const fantasyAnalysis = storyFantasyAnalyzer(storySeed, genre, mcName);
  const timelineConstraint = buildTimelineConstraint(fantasyAnalysis, mcName);
  const worldCtx = buildContextSummary(ws);

  // ─── v5: Scene planning ──────────────────────────────────────────────────
  const actionCount = novel?.action_count ?? 0;
  const scenePlan = await planNextScene(
    String(novelId),
    timelineId,
    ws,
    characters,
    userAction,
    actionCount,
  );
  callbacks.onScenePlan?.(scenePlan);
  const dramaticDirective = buildDramaticDirectiveBlock(scenePlan, ws);

  // ─── v5: Present NPC inference + context block ───────────────────────────
  const presentNpcs = inferPresentNpcs(ws, characters);
  const npcBlock = buildNpcContextBlock(presentNpcs);
  const presentNpcUids = presentNpcs.map(c => c.internal_uid);

  // ─── Context block ───────────────────────────────────────────────────────
  let contextBlock: string;
  if (useLargeContext) {
    const fullCtx = await buildFullGrokContext(novelId, timelineId);
    contextBlock = `FULL STORY CONTEXT (use this to maintain perfect continuity):\n${fullCtx}`;
  } else {
    const memCtx = await buildMemoryContext(novelId, timelineId);
    const recentScenes = await getLastScenes(novelId, timelineId, 3);
    const npcChars = characters.filter(c => c.display_name !== mcName);
    const charSummary = npcChars.slice(0, 8).map(c => `${c.display_name} (${c.role}, ${c.status})`).join(', ');
    const recentSummary = recentScenes.map(s => s.raw_output.slice(0, 200)).join('\n---\n');
    contextBlock = [
      `WORLD CONTEXT:\n${worldCtx}`,
      `ACTIVE NPCs: ${charSummary || 'none yet'}`,
      `RECENT MEMORIES:\n${memCtx}`,
      `RECENT EVENTS:\n${recentSummary}`,
    ].join('\n\n');
  }

  const unintroPcs = characters
    .filter(c => c.role !== 'protagonist' && !c.has_introduced_self && c.status === 'alive')
    .slice(0, 2);

  const introNudge = unintroPcs.length > 0
    ? `\nCHARACTER INTRO NEEDED: ${unintroPcs.map(c => c.display_name).join(' and ')} hasn't introduced themselves yet. Have them state their name and show personality through dialogue.`
    : '';

  const mcKnowledgeState = (genre === 'isekai' || ws.mcIsReborn)
    ? 'stranger-to-world'
    : 'familiar-world';

  const sceneAwarenessContext = [
    `=== SCENE AWARENESS CONTEXT ===`,
    `Current location: ${ws.current_location || 'unknown'}`,
    `Current time: ${ws.time_of_day || 'unknown'}`,
    `Scene count at this location: ${ws.sceneCountAtLocation || 0}`,
    `Characters physically present: ${presentNpcs.map(c => c.display_name).join(', ') || 'none'}`,
    `MC knowledge state: ${mcKnowledgeState}`,
    `Unintroduced characters present: ${unintroPcs.map(c => c.display_name).join(', ') || 'none'}`,
    `Active tension level: ${ws.narrative_tension ?? 20}/100`,
    `=== END SCENE AWARENESS CONTEXT ===`,
  ].join('\n');

  const locationBlock = startingLocation
    ? `\nSTORY STARTING LOCATION: "${startingLocation}"\nHonor it unless a location_change tag fired.`
    : '';

  const driftBlock = offTopicCount >= 5
    ? buildDriftRecoveryPrompt(genre, storySeed, offTopicCount)
    : '';

  const genreIntegrity = buildGenreIntegrityBlock(genre);

  const systemPrompt = presetManager.getGenreSystemPrompt(genre);

  const dramaticQuestionLine = ws.dramatic_question
    ? `End with 3 meaningful choices that advance the dramatic question: "${ws.dramatic_question}".`
    : `End with 3 meaningful choices that engage with the highest-tension active element in the scene.`;

  const userPrompt = [
    timelineConstraint,
    locationBlock,
    genreIntegrity,
    driftBlock,
    `PLAYER CHARACTER (MC): ${mcName}`,
    fantasyAnalysis.fantasySummary ? `\n${fantasyAnalysis.fantasySummary}` : '',
    ``,
    `[STORY CONTEXT]`,
    contextBlock + introNudge,
    ``,
    npcBlock,
    ``,
    dramaticDirective,
    ``,
    sceneAwarenessContext,
    ``,
    `[PLAYER ACTION]`,
    `"${userAction}"`,
    ``,
    `Generate the next scene. Follow the messenger bubble format precisely.`,
    `Small moment — minutes pass, not hours or days.`,
    `Show realistic consequences on the people immediately present.`,
    ``,
    `ABSOLUTE FORMAT RULES — violation breaks the messenger UI:`,
    `✓ EVERY NPC spoken line is its OWN LINE, formatted exactly: [Name]: "spoken words"`,
    `✓ Action beats and narration are SEPARATE LINES from dialogue. NEVER write \`Mirae glances at him. "I know," she whispers.\` as one line — that collapses to a single italic block. ALWAYS split:`,
    `    Mirae glances at him.`,
    `    [Mirae]: "I know."`,
    `✓ Each narrator line is max 2-3 sentences and renders as its own chat bubble.`,
    `✗ NEVER write inline prose dialogue like \`"...", she said.\` — that destroys the UI.`,
    `✗ NEVER use "[You]", "[MC]", "[Player]", or "[${mcName}]" as a speaker tag.`,
    `✗ NEVER echo or repeat the PLAYER ACTION text inside any character's dialogue.`,
    `✗ NEVER write what ${mcName} says outside of /choice/ -> "..." suffixes.`,
    `✓ Honor every constraint in the SCENE DIRECTIVE above.`,
    `✓ Honor every emotional state in the [CHARACTER PROFILES FOR THIS SCENE] block.`,
    `✓ Every scene must contain at least one unexpected beat, one sensory anchor, and one piece of subtext. No bland status updates.`,
    ``,
    `CHOICE FORMAT (always last lines):`,
    `/choice/ [specific action the player can take, grounded in this scene] -> "MC's in-character spoken words if they choose this"`,
    `/choice/ [a different approach] -> "MC's in-character response"`,
    `/choice/ [a riskier or morally complex option] -> "MC's in-character response"`,
    ``,
    dramaticQuestionLine,
    `The MC's spoken text (after ->) will be displayed when the player clicks that choice.`,
  ].filter(Boolean).join('\n');

  let fullText = '';
  try {
    const stream = modelService.generateStream(systemPrompt, userPrompt, {
      maxTokens: useLargeContext ? 2000 : maxTokens,
      temperature,
    });
    for await (const token of stream) {
      fullText += token;
      callbacks.onToken(token);
    }
  } catch (e) {
    callbacks.onError((e as Error).message);
    return fullText;
  }

  const parsed = parseNarrativeTags(fullText);

  // Smart choice validation: re-call AI if choices are missing or identical to previous set
  const previousChoices = lastChoices ?? [];
  const hasChoices = parsed.choices.length >= 2;
  const allSame = parsed.choices.length > 0 && previousChoices.length > 0 &&
    parsed.choices.every((c, i) => c === previousChoices[i]);

  if (!hasChoices || allSame) {
    const strippedText = fullText.split('\n').filter(l => !l.trimStart().startsWith('/choice/')).join('\n');

    const presentCharactersStr = presentNpcs.slice(0, 6).map(c => c.display_name).join(', ');
    const mcTraitsStr = novel?.mc_traits_json && novel.mc_traits_json !== '{}' ? novel.mc_traits_json : 'not specified';
    const choiceOnlyPrompt = `The following scene just happened in a ${genre} story:\n${strippedText.slice(-800)}\n\nCurrent location: ${ws.current_location ?? 'unknown'}\nScene count at this location: ${ws.sceneCountAtLocation ?? 0}\nCharacters present: ${presentCharactersStr || 'none'}\nMC traits: ${mcTraitsStr}\nDramatic question: ${ws.dramatic_question || '(none)'}\nNarrative tension: ${ws.narrative_tension ?? 20}/100\n\nGenerate 3 choices for what the player can do right now.\nEach choice must be specific, consequential, and connected to the scene above — not generic ("say something", "leave").\nFormat each as:\n/choice/ <specific action> -> "<MC's in-character spoken words>"\nOutput ONLY /choice/ lines.`;

    try {
      const choiceText = await modelService.generateText('', choiceOnlyPrompt, { maxTokens: 250, temperature: 0.85 });
      const regenerated = parseChoicesFromText(choiceText);
      if (regenerated.length >= 2) {
        const choiceStr = '\n' + regenerated.map(c => `/choice/ ${c}`).join('\n');
        fullText = strippedText + choiceStr;
        callbacks.onToken(choiceStr);
        parsed.choices.length = 0;
        parsed.choices.push(...regenerated);
      } else {
        throw new Error('insufficient regenerated choices');
      }
    } catch {
      console.warn('[Eden] Choice re-generation failed silently.');
      return fullText;
    }
  }

  if (dryRun) return fullText;

  // Apply all tag-driven side effects + new v5 intelligence side effects
  await applyParsedEffects(novelId, timelineId, mcUid, mcName, genre, fullText, callbacks);

  // ─── v5: Async fire-and-forget post-generation tasks ─────────────────────
  // These must NOT block the player from receiving the next scene.
  void propagateEmotions(novelId, parsed.cleanText || fullText, presentNpcUids, mcName).catch(() => {});
  void updateMomentum(novelId, timelineId, parsed.cleanText || fullText, parsed).catch(() => {});

  return fullText;
}

/**
 * Applies all tag-driven side effects for a completed scene (DB writes, callbacks).
 * Called by both the normal generation path and the predictive cache-hit path so
 * progression/memory/inventory/world-state mutations are identical regardless of
 * whether the scene text came from a live stream or a pre-generated cache entry.
 */
export async function applyParsedEffects(
  novelId: number,
  timelineId: string,
  mcUid: string,
  mcName: string,
  genre: string,
  fullText: string,
  callbacks: GenerationCallbacks,
): Promise<void> {
  const ws = await loadWorldState(novelId);
  const characters = await getCharactersByNovel(novelId);

  const parsed = parseNarrativeTags(fullText);
  callbacks.onTagsParsed(parsed);

  await incrementScene(novelId);
  await incrementSceneCountAtLocation(novelId, parsed.locationChange || ws.current_location);

  // ─── v5: Richer memory ──────────────────────────────────────────────────
  await recordMemory(
    novelId,
    timelineId,
    parsed.cleanText.slice(0, 500),
    50,
    [genre, ws.current_arc],
    { rawSceneText: fullText, tags: parsed },
  );

  if (parsed.locationChange) {
    await updateWorldStateFields(novelId, { current_location: parsed.locationChange });
  }
  for (const ev of parsed.worldEvents) {
    await addWorldEvent(novelId, ev);
  }

  // ─── Existing speaker introduction logic ─────────────────────────────────
  const speakerMatches = fullText.match(/\[([^\]]+)\]:/g) ?? [];
  for (const match of speakerMatches) {
    const name = match.replace(/[\[\]:]/g, '').trim();
    if (isMCSpeaker(name, mcName)) continue;
    const char = characters.find(c => c.display_name.toLowerCase() === name.toLowerCase());
    if (char && !char.has_introduced_self) {
      const dialogueRegex = new RegExp(`\\[${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\][:\\s]*"([^"]{5,300})"`, 'gi');
      let dm: RegExpExecArray | null;
      while ((dm = dialogueRegex.exec(fullText)) !== null) {
        const extractedName = extractRealNameFromIntroduction(dm[1]);
        if (extractedName && extractedName.toLowerCase() !== name.toLowerCase() && char.id) {
          await updateCharacter(char.id, { display_name: extractedName });
          break;
        }
      }
      await markCharacterIntroduced(char.internal_uid, novelId);
    }
  }

  for (const nc of parsed.newCharacters) {
    callbacks.onNewCharacter(nc.name);
    const existing = await getCharacterByUid(nc.name, novelId) || characters.find(c => c.display_name.toLowerCase() === nc.name.toLowerCase());
    if (existing) {
      if (nc.description) {
        try {
          let meta: Record<string, unknown> = {};
          try { meta = JSON.parse(existing.metadata_json); } catch {}
          meta.description = nc.description;
          await updateCharacter(existing.id!, { metadata_json: JSON.stringify(meta) });
        } catch {}
      }
      continue;
    }
    const portrait = await assignPortrait(novelId, '', nc.name, nc.gender, nc.role, genre);
    const created = await createCharacter({
      novel_id: novelId,
      display_name: nc.name,
      portrait_path: portrait.type === 'image' && portrait.src ? portrait.src : '',
      status: 'alive',
      gender: nc.gender,
      role: nc.role,
      metadata_json: nc.description ? JSON.stringify({ description: nc.description }) : '{}',
      first_appeared_chapter: ws.current_chapter,
      current_location: ws.current_location ?? '',
      has_introduced_self: false,
    });
    // v5: fire-and-forget voice profile generation for this new NPC
    void ensureVoiceProfileForCharacter(
      novelId,
      created.internal_uid,
      genre,
      (parsed.cleanText || fullText).slice(0, 800),
    ).catch(() => {});
  }

  const knownNames = characters
    .filter(c => c.display_name && c.display_name.toLowerCase() !== mcName.toLowerCase())
    .map(c => c.display_name);
  const rawBubbles = parseBubbles(fullText, knownNames);
  const speakerNames = extractSpeakerNames(rawBubbles, mcName);
  for (const speakerName of speakerNames) {
    const existing = characters.find(c => c.display_name.toLowerCase() === speakerName.toLowerCase());
    if (!existing) {
      const portrait = await assignPortrait(novelId, '', speakerName, 'unknown', 'npc', genre);
      const created = await createCharacter({
        novel_id: novelId,
        display_name: speakerName,
        portrait_path: portrait.type === 'image' && portrait.src ? portrait.src : '',
        status: 'alive',
        gender: 'unknown',
        role: 'npc',
        metadata_json: '{}',
        first_appeared_chapter: ws.current_chapter,
        current_location: ws.current_location ?? '',
        has_introduced_self: true,
      });
      void ensureVoiceProfileForCharacter(
        novelId,
        created.internal_uid,
        genre,
        (parsed.cleanText || fullText).slice(0, 800),
      ).catch(() => {});
    } else if (!existing.has_introduced_self) {
      await markCharacterIntroduced(existing.internal_uid, novelId);
    }
  }

  for (const ia of parsed.inventoryAdds) {
    await addItem(novelId, mcUid, ia.item, ia.qty);
  }
  for (const ir of parsed.inventoryRemoves) {
    await removeItem(novelId, mcUid, ir.item, ir.qty);
  }
  for (const cd of parsed.characterDeaths) {
    const char = await getCharacterByUid(cd, novelId);
    if (char?.id) await updateCharacter(char.id, { status: 'dead' });
  }
  for (const ru of parsed.relationshipUpdates) {
    await updateRelationship(novelId, mcUid, ru.uid, ru.type, ru.val);
    // Also nudge the v5 metrics so the NPC's matrix shifts with classic tags.
    const delta = Math.max(-25, Math.min(25, Math.round(ru.val / 2)));
    await updateCharacterRelationshipMetrics(ru.uid, novelId, delta, 0, 0).catch(() => {});
  }
  if (parsed.levelUp) {
    try {
      const lvlResult = await triggerLevelUp(novelId, mcUid, genre);
      callbacks.onLevelUp(lvlResult);
    } catch {}
  }
  for (const su of parsed.skillUnlocks) {
    callbacks.onSkillUnlock(su);
  }
  if (parsed.chapterEnd) {
    try {
      const { newChapterId } = await closeChapterAndBeginNext(novelId, timelineId);
      callbacks.onChapterEnd(newChapterId);
      await updateWorldStateFields(novelId, {
        current_chapter: ws.current_chapter + 1,
        scene_count_since_chapter: 0,
      });
    } catch {}
  }
  if (parsed.pilotPause) {
    callbacks.onPilotPause(parsed.pilotPause);
  }

  // ─── v5: NEW TAG WIRING ─────────────────────────────────────────────────
  await applyV5Tags(novelId, parsed);

  // World state dynamic tag updates
  const wsUpdates: Record<string, string> = {};
  if (parsed.timeUpdate) wsUpdates['time_of_day'] = parsed.timeUpdate;
  if (parsed.dateUpdate) wsUpdates['current_date'] = parsed.dateUpdate;
  if (parsed.weatherUpdate) wsUpdates['weather'] = parsed.weatherUpdate;
  if (parsed.moodUpdate) wsUpdates['emotional_state'] = parsed.moodUpdate;
  if (parsed.arcUpdate) wsUpdates['current_arc'] = parsed.arcUpdate;
  if (parsed.pacingUpdate) wsUpdates['pacing'] = parsed.pacingUpdate;
  if (Object.keys(wsUpdates).length > 0) {
    await updateWorldStateFields(novelId, wsUpdates as any);
  }
}

/**
 * Apply v5 NPC intelligence + dramatic momentum tags. Each one is wrapped in
 * a try/catch so a single malformed tag cannot abort the whole pipeline.
 */
async function applyV5Tags(novelId: number, parsed: TagParseResult): Promise<void> {
  // /emotion_shift:uid:emotion:intensity/
  for (const shift of parsed.emotionShifts) {
    try { await updateCharacterEmotion(shift.uid, novelId, shift.emotion, shift.intensity); } catch {}
  }
  // /npc_agenda:uid:agenda/
  for (const a of parsed.npcAgendas) {
    try { await updateCharacterAgenda(a.uid, novelId, a.agenda); } catch {}
  }
  // /secret_revealed:uid:secret/
  for (const s of parsed.secretReveals) {
    try { await markSecretRevealed(s.uid, novelId); } catch {}
  }
  // /tension:N/
  if (parsed.tensionValue !== undefined) {
    try { await updateNarrativeTension(novelId, parsed.tensionValue); } catch {}
  }
  // /revelation:text/  — record + treat as a revealed pending revelation
  for (const r of parsed.revelations) {
    try { await addPendingRevelation(novelId, `[revealed] ${r}`); } catch {}
  }
  // /foreshadow:text/
  for (const f of parsed.foreshadows) {
    try { await addToForeshadowedEvents(novelId, f); } catch {}
  }
  // /threat_add:description/
  for (const t of parsed.threatAdds) {
    try { await addToActiveThreats(novelId, t); } catch {}
  }
  // /threat_resolve:description/
  for (const t of parsed.threatResolves) {
    try { await removeFromActiveThreats(novelId, t); } catch {}
  }
  // /trust_shift:uid:delta/
  for (const t of parsed.trustShifts) {
    try {
      const clamped = Math.max(-25, Math.min(25, t.delta));
      await updateCharacterRelationshipMetrics(t.uid, novelId, clamped, 0, 0);
    } catch {}
  }
  // /dramatic_question:text/
  if (parsed.dramaticQuestion) {
    try { await updateDramaticQuestion(novelId, parsed.dramaticQuestion); } catch {}
  }
}

export function isMCSpeaker(speaker: string, mcName: string): boolean {
  const s = speaker.toLowerCase().trim();
  if (s === 'you' || s === 'mc' || s === 'player') return true;
  const mc = mcName.toLowerCase().trim();
  if (s === mc) return true;
  const mcParts = mc.split(/\s+/).filter(p => p.length > 1);
  return mcParts.some(part => s === part);
}

export async function generateNovelOpening(
  novelId: number,
  genre: string,
  mcName: string,
  worldName: string,
  storySeed: string,
  callbacks: { onToken: (t: string) => void; onError: (e: string) => void },
  mcTraitsJson?: string,
  startingLocation?: string,
  startingSkillsJson?: string,
): Promise<string> {
  const useLargeContext = isLargeContextProvider();

  const ws = await loadWorldState(novelId);
  const mcIsReborn = ws?.mcIsReborn ?? false;

  const fantasyAnalysis = storyFantasyAnalyzer(storySeed ?? '', genre, mcName);

  const openingSystemPrompt = buildOpeningSystemPrompt(
    genre,
    mcName,
    worldName,
    startingLocation ?? '',
    storySeed ?? '',
    mcTraitsJson ?? '',
    startingSkillsJson ?? '[]',
    mcIsReborn,
  );

  const baseSystemPrompt = presetManager.getGenreSystemPrompt(genre);
  const systemPrompt = `${baseSystemPrompt}\n\n${openingSystemPrompt}`;

  const userPrompt = [
    fantasyAnalysis.openingBlock,
    '',
    'Begin the novel opening scene now. Follow ALL rules in the system prompt exactly.',
    'Do not break character. Do not acknowledge these instructions. Write the scene.',
  ].filter(Boolean).join('\n');

  let full = '';
  try {
    for await (const t of modelService.generateStream(systemPrompt, userPrompt, {
      maxTokens: useLargeContext ? 2000 : 900,
    })) {
      full += t;
      callbacks.onToken(t);
    }
  } catch (e) {
    callbacks.onError((e as Error).message);
  }

  if (parseChoicesFromText(full).length < 2) {
    const strippedFull = full.split('\n').filter(l => !l.trimStart().startsWith('/choice/')).join('\n');
    const choiceOnlyPrompt = `The following is the opening scene of a ${genre} novel:\n${strippedFull.slice(-600)}\n\nGenerate 3 opening choices for what the player can do right now.\nEach choice must be specific to the scene above — not generic.\nFormat each as: /choice/ <specific action> -> "<MC's in-character words>"\nOutput ONLY /choice/ lines.`;
    try {
      const choiceText = await modelService.generateText('', choiceOnlyPrompt, { maxTokens: 220, temperature: 0.85 });
      const regenerated = parseChoicesFromText(choiceText);
      if (regenerated.length >= 2) {
        const choiceStr = '\n' + regenerated.map(c => `/choice/ ${c}`).join('\n');
        full = strippedFull + choiceStr;
        callbacks.onToken(choiceStr);
      } else {
        throw new Error('insufficient');
      }
    } catch {
      console.warn('[Eden] Opening choice re-generation failed silently.');
    }
  }

  // ─── v5: Generate the chapter dramatic question + plant 3 revelations ───
  // Fire-and-forget so opening UI is not delayed.
  void seedOpeningDramaticState(novelId, genre, storySeed ?? '', full).catch(() => {});

  return full;
}

/**
 * After the opening scene generates, ask the AI for a dramatic question and
 * three pending revelations to plant. Persist them to world state.
 */
async function seedOpeningDramaticState(
  novelId: number,
  genre: string,
  hook: string,
  openingText: string,
): Promise<void> {
  try {
    const dq = await modelService.generateText(
      'You design the dramatic spine of chapters in dark anime interactive novels. Output one question. No quotes. No prefix.',
      `What dramatic question should drive Chapter 1 of a ${genre} story where: "${hook || 'no hook provided'}"?

Use the opening scene as inspiration:
"""${openingText.slice(0, 600)}"""

Answer in ONE sentence starting with a verb: "Will...", "Can...", "What happens when..."`,
      { maxTokens: 60, temperature: 0.8 },
    );
    const cleanedDq = dq.trim().replace(/^["'`*_]+|["'`*_]+$/g, '').trim();
    if (cleanedDq) {
      await updateDramaticQuestion(novelId, cleanedDq);
      await updateChapterGoal(novelId, cleanedDq);
    }
  } catch {}

  try {
    const revRaw = await modelService.generateText(
      'You plant story seeds for dark anime stories. Output exactly 3 lines, no numbering, no bullets, no quotes.',
      `List 3 intriguing mysteries or seeds to plant subtly in the opening of this story.
Each one should be specific enough that a reader could spot the payoff later.

Genre: ${genre}
Hook: ${hook || '(none)'}
Opening:
"""${openingText.slice(0, 600)}"""

Output 3 lines. One revelation per line.`,
      { maxTokens: 200, temperature: 0.8 },
    );
    const lines = revRaw.split(/\r?\n/).map(l => l.trim().replace(/^[-•*]+\s*/, '').replace(/^["']|["']$/g, '').trim()).filter(Boolean).slice(0, 3);
    for (const line of lines) {
      await addPendingRevelation(novelId, line);
    }
  } catch {}
}
