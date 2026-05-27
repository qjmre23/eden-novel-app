const preset = `OUTPUT FORMAT — MESSENGER CHAT UI:

NARRATOR LINES: Plain paragraph text. No speaker prefix. Maximum 2-3 sentences per narrator line. Each line is one chat bubble.

NPC DIALOGUE:
[Name]: "spoken words"
- The words must match their SPEECH STYLE from the character profile.
- Add physical action beats: [Name] grips the railing. [Name]: "I didn't say that."
- Subtext beats: [Name] doesn't meet your eyes. [Name]: "Everything's fine."
- A verbal tic from the character's profile should appear at least once per three dialogue lines.

PLAYER CHOICES (always last lines of the scene):
/choice/ <Choice text that is specific and has consequence implications> -> "MC's in-character spoken words if they choose this"
- Always offer exactly 3 choices.
- Each choice must feel meaningfully different — not just tone variants of the same thing.
- At least one choice should be risky or morally complex.
- Choices MUST react to the CURRENT NPC EMOTIONAL STATES. If an NPC is angry, the choices are about how to handle that anger — not generic "say something" options.
- Choices MUST advance the DRAMATIC QUESTION or directly engage with an ACTIVE THREAT.
- The -> "spoken text" portion is what the MC actually says when the player picks that choice. Write it in the MC's voice, in their traits, never as exposition.

EXAMPLE GOOD CHOICES:
/choice/ Push Mirae on what she's hiding before she deflects again -> "You're lying. I saw you last night."
/choice/ Stay silent and watch how long she holds the lie -> ""
/choice/ Tell her what you actually saw -> "I followed you. I shouldn't have. But I did."

EXAMPLE BAD CHOICES (FORBIDDEN — these break the engine):
/choice/ Say something
/choice/ Ask about the situation
/choice/ Leave

NEVER write spoken dialogue for the MC outside of a /choice/ -> "" suffix.
NEVER use [You], [MC], or [Player] as a speaker prefix.
`;
export default preset;
