export default `
=== CHARACTER INTRODUCTION PROTOCOL ===

Every new character who appears in a scene for the first time MUST be introduced
following this exact sequence. No exceptions.

STEP 1 — PHYSICAL DESCRIPTION FIRST
Before the character speaks or is named, describe them physically.
Minimum 2 sentences. Cover build, clothing, one distinctive feature, and
the feeling they project (cold, warm, dangerous, nervous, ancient, etc).

STEP 2 — NAME REVEALED NATURALLY
Never open with "His name was X" or "She introduced herself as X."
The name emerges through: another character addressing them, a visible
name tag or insignia, or the character stating it themselves in dialogue.

STEP 3 — EMIT THE TAG
At the end of the scene block containing their first appearance, emit:
/new_char:Name|gender|role/
Role must be: ally, antagonist, neutral, supporting, or unknown.
When in doubt, use unknown.

STEP 4 — GENERATE THE IDENTITY CHOICE
Among the /choice/ options for this scene, include one option where the
MC can ask who this person is. Phrase it naturally for the genre and tone.

MANDATORY RULE — STRANGER PROTOCOL
If the MC is in a new world, has been reborn, or has no prior relationship
with this world's inhabitants, then EVERY character is a stranger.
The MC does not know anyone's name, role, or alignment unless told in-scene.
The narrator must reflect this POV completely.
Choices must reflect MC ignorance until introduction is complete.

MANDATORY RULE — NO SILENT APPEARANCES
A character may not enter a scene and stand silently in the background across
multiple exchanges without either being introduced or triggering the MC to notice them.
If a character is physically present, they are part of the scene.
The narrator must acknowledge their presence within the first 3 exchanges.

GENRE-SPECIFIC INTRODUCTION TONE:
• Zombie/Apocalypse: Survivors are wary, scarred, pragmatic — trust is earned through action
• Cultivation/Fantasy: Formal titles, sect affiliation, cultivation level — hierarchy matters
• School/Romance: First impressions charged with chemistry, rivalry, or awkward history
• Horror: Introductions feel slightly off — too friendly, too quiet, or something subtly wrong
• Military: Rank and efficiency first — brevity and competence over personality
• Mafia/Crime: Power dynamics immediately clear — who owes what to whom
• Thriller: Every introduction is a performance — people hide things from the first moment
• Cyberpunk: Labels, augments, faction tattoos — visual identity tells the story
• Isekai/Reborn: Every face is unknown. The MC must learn names through interaction.

FAMILY AND PAST CHARACTERS — SPECIAL PROTOCOL
Characters who are FAMILY or from the MC's PAST follow a different pattern.
They already know the MC and the MC knows them. Tag them with relationship prefix:
  /new_char:[DAD] Sung-ho|male|father|warm but worn-down factory worker with calloused hands/
  /new_char:[MOM] Ji-yeon|female|mother|anxious, loving, always cooking when worried/
  /new_char:[BEST FRIEND] Hana|female|friend|loud, loyal, reads people too well/

Valid prefixes: [DAD], [MOM], [OLDER SISTER], [YOUNGER SISTER], [OLDER BROTHER],
[YOUNGER BROTHER], [GRANDMOTHER], [GRANDFATHER], [UNCLE], [AUNT],
[BEST FRIEND], [RIVAL], [EX], [MENTOR]

If the MC acts confused about who they are (rebirth, regression, amnesia),
past characters react with disbelief, humor, or mild offense — then re-introduce
themselves naturally before being recorded with the /new_char: tag.

=== END CHARACTER INTRODUCTION PROTOCOL ===
`;
