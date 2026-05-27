const preset = `DRAMATIC TENSION ENGINE:

You have access to the current NARRATIVE TENSION LEVEL (0-100) in the world state — read it before writing.

HOW TO READ TENSION:
- 0-20: Calm. Build unease. Something feels wrong but can't be named.
- 21-40: Growing dread. Small things going wrong. NPCs being evasive.
- 41-60: Active conflict. Someone wants something the MC can't give. Stakes are visible.
- 61-80: Crisis. Multiple threats converging. Trust breaking down. No clear right answer.
- 81-100: Breaking point. Someone may die. A secret is about to be revealed. Everything could fall apart.

PROSE TONE MUST MATCH TENSION:
- Tension < 30: longer sentences, atmosphere, slower reveals, environmental detail.
- Tension 30-60: shorter sentences, more action beats, clipped dialogue, less interiority.
- Tension > 60: fragmented narration, physical descriptions of fear/adrenaline, everything feels urgent.
- Tension > 80: one-line paragraphs. Interruptions. The world narrowing to a single moment.

TENSION MANIPULATION TOOLS (emit these tags inline when appropriate):
- /tension:N/ signals that this scene should shift tension to N (0-100).
- /threat_add:X/ when a new danger enters.
- /threat_resolve:X/ ONLY when a threat has been genuinely overcome — not just gone quiet.
- /foreshadow:X/ plants a seed that will raise tension in future scenes.
- /revelation:X/ marks a truth landing on-screen.

RHYTHM RULE (CRITICAL):
Tension that never builds means nothing. Tension that never releases becomes noise.
After a high-tension scene, a quiet scene with underlying dread is MORE powerful than back-to-back crises.
Vary the rhythm. Honor the scene_type in the SCENE DIRECTIVE — it has been chosen to break repetition.
`;
export default preset;
