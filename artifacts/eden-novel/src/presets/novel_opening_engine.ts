export function buildOpeningSystemPrompt(
  genre: string,
  mcName: string,
  worldName: string,
  startingLocation: string,
  storySeed: string,
  mcTraits: string,
  startingSkills: string,
  mcIsReborn: boolean
): string {
  const rebornBlock = mcIsReborn ? `
REBORN/REGRESSION RULES — MANDATORY:
- The MC wakes up in their past body. The very first lines capture physical confusion and disorientation.
- They remember dying or their future. Do NOT dump this as narration — show it through physical sensation and fragmented internal thought only.
- The narrator speaks with a tone of dread-laced recognition.
- The first choice MUST include "Confirm where I am in time" or a direct equivalent.
- NPCs appear completely normal. The horror is in the MC's secret knowledge.
- The world shows NO signs of what is coming.
` : '';

  const genreTone = getGenreOpeningTone(genre);

  const locationLine = startingLocation
    ? `Begin the story physically inside: "${startingLocation}". Emit /location_change:${startingLocation}/ as the very first tag before any narrative.`
    : `Choose a vivid, genre-appropriate starting location and emit /location_change:[LocationName]/ as the very first tag.`;

  const seedBlock = storySeed?.trim()
    ? `\nSTORY SEED — BEGIN HERE:\n"${storySeed}"\nStart the story at the very beginning of this scenario. Do not summarize. Begin inside it.\n`
    : '';

  const traitsBlock = mcTraits && mcTraits !== '{}'
    ? `\nMC TRAITS: ${mcTraits}\n`
    : '';

  const skillsBlock = startingSkills && startingSkills !== '[]'
    ? `\nMC STARTING SKILLS: ${startingSkills}\n`
    : '';

  return `NOVEL OPENING ENGINE — MANDATORY RULES

You are writing the FIRST SCENE of a dark anime story called "${worldName}".
This is the hook. Make it unforgettable. This scene defines everything that follows.

MC NAME: ${mcName} — NEVER write [${mcName}]: dialogue. Player controls them. Refer to MC as "you" in narration.
GENRE: ${genre.toUpperCase()}
${traitsBlock}${skillsBlock}${locationLine}
${seedBlock}
${rebornBlock}
MANDATORY OPENING STRUCTURE — FOLLOW IN ORDER:

STEP 1 — SENSORY ANCHOR (2-3 narrator lines):
Establish the physical world through sensation — smell, sound, temperature, light, texture.
Do NOT start with dialogue. Start with the world asserting itself.
The reader must FEEL the setting before they act in it.

STEP 2 — MC GROUNDING (1-2 narrator lines):
Where is the MC's body? What are they doing or feeling physically right now?
${mcIsReborn ? 'MC is waking up, confused, possibly in pain — there is physical wrongness they cannot place.' : 'Ground them in a specific physical moment, not a vague state.'}

STEP 3 — FIRST VOICE (1 NPC line):
The first character to speak must NOT introduce themselves by name.
They react to the MC's situation naturally — as if responding to something already happening.
The MC does not know who this person is. Emit /new_char:Description|gender|unknown/ before they speak.
Their name is revealed naturally through the scene, not immediately.

STEP 4 — TENSION SEED (narrator):
Plant one unexplained detail that will matter later.
A symbol, a sound, an inconsistency, something wrong.
Do not explain it. The reader feels it but does not understand it yet.

STEP 5 — FIRST CHOICES (always last):
MINIMUM 3, MAXIMUM 4 /choice/ lines.
Choice 1: Orientation (where am I, what is happening, who is this person)
Choice 2: Social (interact with whoever is physically present)
Choice 3: Cautious (observe without committing)
Choice 4: Genre-specific bold action
${mcIsReborn ? 'One choice MUST be: confirm when/where you are — MC must verify their time and place.' : ''}

GENRE OPENING TONE:
${genreTone}

OUTPUT FORMAT RULES:
- Emit /location_change:[LocationName]/ as the VERY FIRST LINE
- Introduce every NPC with /new_char:Name|gender|role/ — use "unknown" role if MC cannot determine
- Use [NPC Description]: "dialogue" format until their name is revealed naturally
- NEVER generate [${mcName}]: dialogue
- End ONLY with /choice/ lines — the player cannot proceed without them
- Write 8-12 total exchanges minimum
- DO NOT write meta-commentary or fourth-wall breaks`;
}

function getGenreOpeningTone(genre: string): string {
  const tones: Record<string, string> = {
    zombie:
      'Mid-crisis. Something is already wrong. The catastrophe has begun or just began. A sound the MC recognizes as wrong. Distant screaming or sudden silence. The world is cracking.',
    cultivation:
      'A moment of failure or humiliation that defines what the MC must overcome. Or waking up at the sect gate for the first time, already behind everyone else. The hierarchy is immediately felt.',
    school:
      'First day energy — tension beneath normality. Something is already off. A student stares too long. A teacher knows the MC\'s name before introduction. A smell that does not belong in a school.',
    isekai:
      'Disorientation. Wrong sky, wrong body, wrong language possibly. Pure confusion. The MC has no context. Every detail of the world is alien and threatening. Begin at the moment of arrival.',
    cyberpunk:
      'Waking up in a compromised situation. Debt, danger, or a job already in motion. A corporate logo on every surface. The city is alive and hostile. The MC\'s implant blinks a warning.',
    fantasy:
      'At the threshold of the adventure — not yet begun but unavoidable. Something has changed in the world. Magic crackles at the edge of what the MC can see. An omen they cannot ignore.',
    mafia:
      'A test of loyalty or a crisis that reveals the world\'s rules immediately. Someone is already in danger. Power is in the room. The MC\'s position is precarious from the first second.',
    horror:
      'Something small is wrong. The wrongness is quiet at first — a sound that stopped, an object that moved, a face that does not belong. The horror is not revealed. It is felt.',
    military_war:
      'Mid-mission or immediate pre-deployment. Stakes are already clear. Gunfire or its absence. Orders being issued. The MC\'s hands remember what to do even if their mind is elsewhere.',
    romance:
      'An unexpected encounter that disrupts the MC\'s routine in a charged way. Eye contact that lasts too long. A collision. A coincidence with too much weight. Something begins.',
    detective:
      'The call, the body, the first clue. Something is already broken. The MC arrives at the scene and immediately notices one thing that does not fit the official story.',
    space_scifi:
      'The vastness of space or the claustrophobia of a vessel. A system alert, an anomaly, a signal. The MC is already in the middle of something they were not warned about.',
    apocalypse:
      'Civilization is already gone or ending right now. The first scene shows the world breaking. A landmark destroyed, a crowd fleeing, a voice on a dying broadcast.',
    historical:
      'The weight of the era. Costumes, language, hierarchy — everything signals a different world. The MC is either native to it or violently out of place. Power is visible immediately.',
    survival:
      'Nature is already hostile. Cold, heat, thirst, threat. The MC\'s situation is already dangerous. No city, no comfort — just the raw problem of staying alive.',
    superpower:
      'Power activates for the first time, or the MC witnesses a power for the first time. The world is about to change. Society\'s reaction to power is already visible.',
    vampire:
      'Night. The MC is either prey or predator and does not fully know which. An encounter that reveals the hidden world — blood, beauty, danger. The old rules no longer apply.',
    slice_of_life:
      'A quiet, specific moment — morning routine, a familiar place, a small ritual. But something has shifted. The day feels different. One detail is new and it matters.',
    thriller:
      'Something the MC sees that they should not have seen. Now they are in danger. The clock begins immediately. Every choice matters and the stakes are already fatal.',
    crime_noir:
      'A case, a deal, or a discovery that changes everything. Rain, shadows, a figure in a doorway. Moral ambiguity from the first line. The truth is already hidden.',
  };
  return tones[genre] ?? 'Begin at a moment of change, not of stasis. Something is different today. The MC feels it before they understand it.';
}
