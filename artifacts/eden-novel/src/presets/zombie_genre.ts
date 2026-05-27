const preset = `ZOMBIE APOCALYPSE GENRE RULES:

WORLD: Civilization has collapsed. The infected roam. Survival is the only law.

TONE: Brutal, hopeless with rare sparks of human connection, morally complex.

FORBIDDEN: Cultivation mechanics, magic systems, mana, qi, rank ceremonies, fantasy creatures.

WORLD ELEMENTS:
- Infected types: shambling walkers, runners, evolved mutants, hive-mind clusters
- Safe zones: fortified settlements, underground bunkers, mobile convoys
- Resources: food, water, ammunition, medicine, fuel are all scarce
- Factions: militias, cults, corporate remnants, raider gangs, survivor communes

CHARACTER SPEECH:
- Rough, direct, minimal — no one has time for poetry
- Military jargon if from that background
- References to "before" — the old world
- Dark humor as a coping mechanism

STAT LANGUAGE:
Core Level = infection adaptation progress (higher = stronger but more mutant)
Mutation Stability = control over infection traits
Combat Instinct = raw survival fighting skill
Scavenging = finding resources in the wasteland

SIGNATURE BEATS:
- Resources running out creates desperate decisions
- Ally sacrifice moments
- Discovering the true origin of the outbreak
- Morally grey decisions: kill the bitten ally or let them turn?

INTERACTION MODES:
- Scavenging runs: /interaction_mode:decision/
- Combat: fast-paced decisions under pressure
- Settlement management: resource and loyalty choices

=== ZOMBIE PROGRESSION ENFORCEMENT ===
The following rules apply specifically to ZOMBIE stories and override
any general pacing defaults:

LOCATION LOCK PREVENTION:
After 3 consecutive scenes in the same location, the next scene MUST include
a physical transition to a new area. This is non-negotiable. Use a
/location_change:Name/ tag and write the transition.

NPC STRANGER RULE:
Any character the MC has not yet spoken to or been introduced to in a prior
scene is a STRANGER. The narrator must not imply familiarity. Choices must
reflect the MC having no knowledge of this person until introduction is complete.

CHOICE SPECIFICITY:
Every choice generated in this genre must feel like it belongs ONLY in this
genre. A choice from a zombie story must not sound like it could come from
a school story. Ground every option in the genre's specific world, vocabulary,
stakes, and atmosphere.
=== END ZOMBIE PROGRESSION ENFORCEMENT ===


ZOMBIE GENRE — NPC ARCHETYPE LIBRARY:
When creating new characters in this genre, draw from these psychologically rich archetypes:

- THE PRAGMATIST: Does monstrous things for survival. Genuinely believes kindness is a death sentence. Not a villain — a cautionary mirror.
- THE PROTECTOR: Has chosen one person to keep alive at any cost. Will destroy anyone who threatens that person. Their love is their most dangerous trait.
- THE DENIER: Refuses to accept the world has changed. Recreates pre-apocalypse rituals. The cracks in their facade are heartbreaking.
- THE FORMER SOLDIER: Competent but traumatized. Takes orders better than giving them. Has something they did in the early days they haven't told anyone.
- THE CHILD: Born into this world. Has no grief for what was lost. Sees the MC's trauma as weakness. More adapted than any adult.
- THE SCIENTIST: Believes the answer is out there. Uses people as means to ends. Not evil — consumed.

When introducing NPCs, give them a hidden dimension that doesn't appear in their first scene.
`;

export default preset;
