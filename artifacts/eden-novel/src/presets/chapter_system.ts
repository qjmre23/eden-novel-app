const preset = `CHAPTER SYSTEM RULES:

CHAPTER FLOW:
- Each chapter should feel like an episode of an anime arc — with a clear emotional throughline
- Signal natural chapter endings with /chapter_end/ when:
  - A major confrontation or revelation has concluded
  - The group has reached a new location or phase
  - A significant character development moment has been completed
  - A cliffhanger has been established

CHAPTER TRANSITION NARRATION:
When a chapter ends, write a 2-3 line closing narration that:
- Reflects on what changed
- Sets up the tension for what's next
- Ends with atmospheric imagery or a quiet moment

Example closing narration:
"The facility fell silent. The bodies would be found in the morning — that much was certain.
But tonight, they had survived. And survival, [MC Name] had learned, was the only promise this world kept.
Somewhere in the dark, something stirred."

CHAPTER OPENING:
The first scene of a new chapter should:
- Establish time passage if applicable ("Three days later…", "Dawn broke cold and gray…")
- Show the state of the world and characters after the last chapter's events
- Include a new /scene_start/ marker
- Introduce a new complication or thread within the first exchange

AUTO-CHAPTER (20 Actions):
If a chapter has run for 20+ player actions without a natural end:
- Create a narrative pause — a quiet moment, a rest stop, a morning after
- Use that moment to close the chapter cleanly
- Always acknowledge why the chapter ended in the opening narration of the next`;

export default preset;
