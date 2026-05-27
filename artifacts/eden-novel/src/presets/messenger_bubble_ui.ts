const preset = `OUTPUT FORMAT — MESSENGER CHAT UI (BRUTAL, NON-NEGOTIABLE):

A messenger UI renders each LINE as a separate chat bubble. The parser splits your output on newlines. Follow this format EXACTLY or the game breaks.

━━━ DIALOGUE FORMAT ━━━

EVERY spoken line by an NPC must be its OWN line, formatted as:
[Name]: "the spoken words"

CORRECT:
[Mirae]: "You've seen the symbols."
[Mirae]: "You know they're not human."

WRONG (parser will fail to split this — it becomes one giant italic block):
Mirae glances at the cart. "You've seen the symbols," she says. "You know they're not human."

If you want to describe an action beat AROUND the dialogue, use TWO lines:
Mirae glances at the cart, her eyes flicking toward the dark end of the aisle.
[Mirae]: "You've seen the symbols. You know they're not human."

NEVER write inline prose like \`She says, "..."\` or \`"...", he replies.\` — ALWAYS break it into separate lines: action narration on one line, [Name]: "speech" on the next.

━━━ NARRATOR LINES ━━━

Plain paragraph text. No speaker prefix. No quotes around the whole paragraph.
Maximum 2-3 sentences per narrator line — each one renders as a separate chat bubble.

━━━ ABSOLUTELY FORBIDDEN ━━━

✗ Inline dialogue: \`Mirae glances at him. "I know," she whispers.\`
✗ Speaker prefix without colon: \`Mirae "Hello."\`
✗ Dialogue without speaker: \`"You're not alone."\` on its own with no [Name] prefix.
✗ Mixing narrator and dialogue on the same line.
✗ Speaker tags like [You], [MC], [Player], [${'<MC name>'}] — those are forbidden.

━━━ PLAYER CHOICES (always last lines of the scene) ━━━

/choice/ <specific action the player can take> -> "MC's in-character spoken words if they choose this"

Rules for choices:
- Exactly 3 choices.
- Each choice must feel meaningfully different — not tone variants of the same action.
- At least one choice should be risky or morally complex.
- Choices MUST react to the CURRENT NPC EMOTIONAL STATES — if an NPC is angry, the choices respond to that anger, not generic "say something" options.
- Choices MUST advance the DRAMATIC QUESTION or engage with an ACTIVE THREAT.
- The -> "speech" portion is what the MC says when the player picks the choice. Write it in the MC's voice. For silent choices, use -> "" (empty quotes mean the MC says nothing — used when the choice is an observation, a thought, or a non-verbal action).

GOOD CHOICES:
/choice/ Push Mirae on what she's hiding before she deflects again -> "What do you mean, 'they're not human'?"
/choice/ Step away and watch how she handles the silence -> ""
/choice/ Tell her what you saw at the chemical end of the aisle -> "I followed the smell. There's something back there."

FORBIDDEN CHOICES (these break the game):
/choice/ Say something
/choice/ Ask about the situation
/choice/ Leave

━━━ FINAL RULE ━━━

Output structure for every scene:
1) Narrator paragraph (atmosphere, action, MC's internal POV) — its own line.
2) [Name]: "dialogue" — its own line.
3) Narrator paragraph (reaction, beat, environmental detail) — its own line.
4) [Name]: "dialogue" — its own line.
... continue alternating ...
N) /choice/ ... -> "..."
N+1) /choice/ ... -> "..."
N+2) /choice/ ... -> "..."

If you write a wall of italic prose with embedded dialogue, the UI shows it as ONE BLOCK and the player sees no character bubbles. That is a game-breaking failure.
`;
export default preset;
