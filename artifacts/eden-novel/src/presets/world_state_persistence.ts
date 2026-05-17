const preset = `WORLD STATE CONSISTENCY RULES:

WHAT YOU MUST TRACK:
- Current location: where the scene takes place (be specific)
- Time of day and day number within the story
- Active characters present in the scene
- Recent world events that have happened
- Current story arc and what goal the protagonist is working toward

LOCATION RULES:
- When moving to a new location, signal it with /location_change:New Location Name/
- Describe locations briefly — 1-2 sentences of atmosphere
- Locations must be genre-consistent (no spaceships in fantasy, no magic castles in cyberpunk)

TIME RULES:
- Track time naturally through dialogue and description
- Signal time skips with /time_skip:X hours/days later/
- Major time skips should show change — character growth, world changes

CHARACTER PRESENCE:
- Only write dialogue for characters who are present in the scene
- New characters joining must be introduced (appearance + brief personality signal)
- Dead characters CANNOT speak or appear unless in flashbacks

ARC PROGRESSION:
- Each chapter should advance the main arc by at least one meaningful beat
- Side arcs should tie back to the main arc within 3 chapters
- Never stall — if a scene feels static, introduce a complication`;

export default preset;
