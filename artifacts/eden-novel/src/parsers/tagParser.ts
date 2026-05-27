export type ParsedTag = {
  type: string;
  value?: string;
  raw: string;
};

export type ChoiceOption = {
  label: string;
  roleplayText?: string;
};

export type TagParseResult = {
  cleanText: string;
  tags: ParsedTag[];
  choices: string[];
  choiceOptions: ChoiceOption[];
  interactionMode?: string;
  levelUp?: boolean;
  chapterEnd?: boolean;
  newCharacters: { name: string; gender: string; role: string; description?: string }[];
  characterUpdates: { uid: string; field: string; val: string }[];
  locationChange?: string;
  timeSkip?: string;
  skillUnlocks: string[];
  inventoryAdds: { item: string; qty: number }[];
  inventoryRemoves: { item: string; qty: number }[];
  characterDeaths: string[];
  relationshipUpdates: { uid: string; type: string; val: number }[];
  worldEvents: string[];
  pilotPause?: string;
  timeUpdate?: string;
  dateUpdate?: string;
  weatherUpdate?: string;
  moodUpdate?: string;
  arcUpdate?: string;
  pacingUpdate?: string;
  // --- v5 NPC intelligence & dramatic momentum tags ---
  emotionShifts: { uid: string; emotion: string; intensity: number }[];
  npcAgendas: { uid: string; agenda: string }[];
  secretReveals: { uid: string; secret: string }[];
  tensionValue?: number;
  revelations: string[];
  foreshadows: string[];
  threatAdds: string[];
  threatResolves: string[];
  trustShifts: { uid: string; delta: number }[];
  dramaticQuestion?: string;
};

const TAG_RE = /\/([a-zA-Z_]+)(?::([^\/\n]*))?\//g;

export function parseNarrativeTags(text: string): TagParseResult {
  const result: TagParseResult = {
    cleanText: text,
    tags: [],
    choices: [],
    choiceOptions: [],
    newCharacters: [],
    characterUpdates: [],
    skillUnlocks: [],
    inventoryAdds: [],
    inventoryRemoves: [],
    characterDeaths: [],
    relationshipUpdates: [],
    worldEvents: [],
    emotionShifts: [],
    npcAgendas: [],
    secretReveals: [],
    revelations: [],
    foreshadows: [],
    threatAdds: [],
    threatResolves: [],
    trustShifts: [],
  };

  let cleanText = text;
  const choiceLines: string[] = [];
  const choiceOptions: ChoiceOption[] = [];

  const lines = text.split('\n');
  const processedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('/choice/')) {
      const choiceContent = trimmed.replace('/choice/', '').trim();
      if (choiceContent) {
        // Parse optional roleplay text: [label] -> "roleplay text"
        const roleplayMatch = choiceContent.match(/^(.+?)\s*->\s*"(.+)"$/);
        if (roleplayMatch) {
          choiceLines.push(roleplayMatch[1].trim());
          choiceOptions.push({ label: roleplayMatch[1].trim(), roleplayText: roleplayMatch[2].trim() });
        } else {
          choiceLines.push(choiceContent);
          choiceOptions.push({ label: choiceContent });
        }
      }
      continue;
    }
    processedLines.push(line);
  }

  if (choiceLines.length > 0) {
    result.choices = choiceLines;
    result.choiceOptions = choiceOptions;
    result.interactionMode = 'decision';
  }

  cleanText = processedLines.join('\n');

  const matches = [...cleanText.matchAll(TAG_RE)];
  for (const match of matches) {
    const [raw, type, value] = match;
    result.tags.push({ type, value, raw });

    switch (type) {
      case 'interaction_mode':
        result.interactionMode = value;
        break;
      case 'location':
      case 'location_change':
        result.locationChange = value;
        break;
      case 'level_up':
        if (value === 'true') result.levelUp = true;
        break;
      case 'chapter_end':
        if (value === 'true') result.chapterEnd = true;
        break;
      case 'new_character': {
        const parts = (value || '').split('|');
        if (parts.length >= 3) {
          result.newCharacters.push({
            name: parts[0].trim(),
            gender: parts[1].trim() || 'unknown',
            role: parts[2].trim() || 'supporting',
            description: parts[3]?.trim(),
          });
        }
        break;
      }
      case 'character_update': {
        const parts = (value || '').split(':');
        result.characterUpdates.push({ uid: parts[0], field: parts[1], val: parts[2] });
        break;
      }
      case 'skill_unlock':
        if (value) result.skillUnlocks.push(value);
        break;
      case 'inventory_add': {
        const parts = (value || '').split(':');
        result.inventoryAdds.push({ item: parts[0], qty: parseInt(parts[1] || '1') });
        break;
      }
      case 'inventory_remove': {
        const parts = (value || '').split(':');
        result.inventoryRemoves.push({ item: parts[0], qty: parseInt(parts[1] || '1') });
        break;
      }
      case 'character_death':
        if (value) result.characterDeaths.push(value);
        break;
      case 'relationship_update': {
        const parts = (value || '').split(':');
        result.relationshipUpdates.push({ uid: parts[0], type: parts[1], val: parseInt(parts[2] || '0') });
        break;
      }
      case 'world_event':
        if (value) result.worldEvents.push(value);
        break;
      case 'pilot_pause':
        result.pilotPause = value;
        break;
      case 'time_skip':
        result.timeSkip = value;
        break;
      case 'arc_complete':
        result.chapterEnd = true;
        break;
      case 'time_update':
        result.timeUpdate = value;
        break;
      case 'date_update':
        result.dateUpdate = value;
        break;
      case 'weather_update':
        result.weatherUpdate = value;
        break;
      case 'mood_update':
        result.moodUpdate = value;
        break;
      case 'arc_update':
        result.arcUpdate = value;
        break;
      case 'pacing_update':
        result.pacingUpdate = value;
        break;
      // ─── v5 NPC intelligence & dramatic momentum ───────────────────
      case 'emotion_shift': {
        const parts = (value || '').split(':').map(p => p.trim());
        if (parts.length >= 3) {
          result.emotionShifts.push({
            uid: parts[0],
            emotion: parts[1],
            intensity: Math.max(0, Math.min(100, parseInt(parts[2] || '50', 10))),
          });
        }
        break;
      }
      case 'npc_agenda': {
        const parts = (value || '').split(':');
        if (parts.length >= 2) {
          result.npcAgendas.push({ uid: parts[0].trim(), agenda: parts.slice(1).join(':').trim() });
        }
        break;
      }
      case 'secret_revealed': {
        const parts = (value || '').split(':');
        if (parts.length >= 1) {
          result.secretReveals.push({
            uid: parts[0].trim(),
            secret: parts.slice(1).join(':').trim(),
          });
        }
        break;
      }
      case 'tension': {
        const n = parseInt((value || '').trim(), 10);
        if (!Number.isNaN(n)) result.tensionValue = Math.max(0, Math.min(100, n));
        break;
      }
      case 'revelation':
        if (value) result.revelations.push(value.trim());
        break;
      case 'foreshadow':
        if (value) result.foreshadows.push(value.trim());
        break;
      case 'threat_add':
        if (value) result.threatAdds.push(value.trim());
        break;
      case 'threat_resolve':
        if (value) result.threatResolves.push(value.trim());
        break;
      case 'trust_shift': {
        const parts = (value || '').split(':');
        if (parts.length >= 2) {
          const delta = parseInt(parts[1].trim(), 10);
          if (!Number.isNaN(delta)) result.trustShifts.push({ uid: parts[0].trim(), delta });
        }
        break;
      }
      case 'dramatic_question':
        if (value) result.dramaticQuestion = value.trim();
        break;
    }
  }

  // Strip ALL tag patterns aggressively — first structured tags, then any remaining tag-like artifacts
  cleanText = cleanText
    .replace(TAG_RE, '')
    // Catch any malformed tag starts that weren't matched
    .replace(/\/[a-zA-Z_]+:[^\n]*/g, '')
    .replace(/\/[a-zA-Z_]+\//g, '')
    .replace(/\/[a-zA-Z_]+/g, '')
    // Formatting tags
    .replace(/\/bold\//g, '**').replace(/\/endbold\//g, '**')
    .replace(/\/italic\//g, '_').replace(/\/enditalic\//g, '_')
    .replace(/\/whisper\//g, '').replace(/\/endwhisper\//g, '')
    .replace(/\/thought\//g, '').replace(/\/endthought\//g, '')
    .replace(/\/scene_start\//g, '').replace(/\/scene_end\//g, '')
    .replace(/\/speaker_uid:[^/]*/g, '').replace(/\/emotion:[^/]*/g, '')
    .replace(/\/pause:\d+\//g, '')
    .replace(/\/faction_change:[^/]*/g, '')
    .replace(/\/path:[^/]*/gi, '')
    .replace(/\*{2,}/g, '**')
    .replace(/\n{3,}/g, '\n\n').trim();

  result.cleanText = cleanText;
  return result;
}

export function parseBubbles(text: string): { speaker?: string; content: string; isNarrator?: boolean }[] {
  const lines = text.split('\n').filter(l => l.trim());
  const bubbles: { speaker?: string; content: string; isNarrator?: boolean }[] = [];

  for (const line of lines) {
    const dialogueMatch = line.match(/^([^:]+):\s*"(.+)"/);
    const namedMatch = line.match(/^\[([^\]]+)\]\s+(.+)/);
    if (dialogueMatch) {
      bubbles.push({ speaker: dialogueMatch[1].trim(), content: dialogueMatch[2].trim() });
    } else if (namedMatch) {
      bubbles.push({ speaker: namedMatch[1].trim(), content: namedMatch[2].trim() });
    } else {
      bubbles.push({ content: line.trim(), isNarrator: true });
    }
  }
  return bubbles;
}

/**
 * Extract unique speaker names from parsed bubbles that are NOT the MC.
 * Useful for auto-detecting characters that appear in scenes but weren't
 * explicitly declared via /new_char: tags.
 */
export function extractSpeakerNames(
  bubbles: { speaker?: string; isNarrator?: boolean }[],
  mcName: string
): string[] {
  const names = new Set<string>();
  for (const b of bubbles) {
    if (b.speaker && !b.isNarrator) {
      const s = b.speaker.toLowerCase().trim();
      const mc = mcName.toLowerCase().trim();
      if (s !== mc && !mc.split(/\s+/).filter(p => p.length > 1).some(part => s === part)) {
        names.add(b.speaker.trim());
      }
    }
  }
  return Array.from(names);
}
