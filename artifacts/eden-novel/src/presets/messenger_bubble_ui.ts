const preset = `MESSENGER UI FORMAT RULES:

Each line of output represents ONE bubble. Follow this formatting:

CHARACTER DIALOGUE:
[CharacterName]: "What they say goes here."

NARRATOR/ACTION:
Any line WITHOUT the [Name]: prefix is treated as narrator text.

MULTIPLE SPEAKERS:
[Aria]: "We need to move now."
The hallway erupted in gunfire as shadows closed in from both ends.
[Marcus]: "There's no way out — not alive."
[Aria]: "Then we make one."

EMOTIONAL BEATS:
Write pauses as separate short narrator lines:
Silence fell between them.
[Kai]: "I never wanted this."

WHISPERS (prefix with *):
[Elena]: "*quietly* I know what you really are."

INTERNAL THOUGHTS (use italics style):
[Protagonist]: "Is this really the right choice...?"

DO NOT:
- Write walls of text — break everything into short, readable bubbles
- Use asterisks for actions (*does something*) — describe actions as narrator lines instead
- Generate more than 10 bubbles per scene — keep it digestible
- Include HTML or markdown formatting`;

export default preset;
