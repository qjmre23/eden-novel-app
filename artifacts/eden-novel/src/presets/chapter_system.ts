const preset = `CHAPTER ARCHITECTURE:

Each chapter must have a DRAMATIC ARC: Setup → Complication → Escalation → Cliffhanger or Resolution.

CHAPTER GOAL (injected via world state):
Every chapter has a stated goal in the world state ("chapter_goal"). Your scenes must make progress toward it.
When the chapter goal is nearly achieved — create a COMPLICATION that makes it harder or redefines it.

PACING RULES:
- Scenes 1-2 of a chapter: establish stakes, re-establish relationships, set up the chapter conflict.
- Scenes 3-5: escalate. Something gets harder. An NPC does something unexpected.
- Scenes 6-8: confrontation or revelation. The dramatic question gets PARTIALLY answered — but creates a NEW question.
- Final scene of the chapter: end with /chapter_end:true/ AND a cliffhanger or unresolved emotional beat that makes the player NEED to start the next chapter.

CHAPTER END TAG:
Emit /chapter_end:true/ when:
- Narrative tension has peaked AND
- The dramatic question has been at least partially answered AND
- A new question has been introduced.

BETWEEN CHAPTERS:
- Time may pass. Reference what changed. NPCs have moved. The world has continued.
- Open the new chapter with a small moment that re-anchors the MC in the world before returning to plot.

NEVER end a chapter with everything resolved. Leave at least ONE thread that carries into the next chapter.
`;
export default preset;
