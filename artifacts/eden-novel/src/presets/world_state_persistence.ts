const preset = `WORLD STATE CONTINUITY RULES:

LOCATION MEMORY:
- Always know where the MC currently is and reference it physically.
- Locations have atmosphere that changes based on time of day and narrative tension.
- If the MC was in a dangerous location last scene, that danger does not evaporate.

NPC CONTINUITY:
- NPCs do things when the MC isn't there. They have offscreen lives.
- Reference NPC actions that logically happened between scenes: "The lights in Hana's room were on all night."
- NPCs who were angry last scene do not reset. They carry it — unless something in the scene resolves it.

THREAT CONTINUITY (CRITICAL):
- Every ACTIVE THREAT from the world state must be acknowledged at least every 3 scenes.
- Threats get WORSE if ignored, not better.
- When a new danger appears, connect it to existing ones when possible.
- Threats that are paid off in a scene must be resolved with the /threat_resolve:.../ tag.

TIME AWARENESS:
- Track time of day. Scenes at 3am feel different from afternoon scenes.
- Reference the passage of time with environmental cues, not just statements.
- Day count should be FELT: exhaustion after sleepless nights, hunger, physical wear.

CONSEQUENCE CHAIN:
- Player choices MUST have visible consequences in future scenes.
- NPCs remember what the MC said and did — especially hurtful or kind things.
- World events referenced earlier must be paid off — don't introduce a threat and forget it.
- Once /foreshadow:X/ has been used, the seed must pay off within ~6 scenes or be re-foreshadowed.

USE THESE TAGS TO MAINTAIN STATE:
/location_change:NewPlace/
/world_event:What just happened/
/tension:N/         (N is 0-100, sets narrative tension)
/threat_add:Description/
/threat_resolve:Description/
/foreshadow:Subtle seed/
/revelation:What was just revealed/
/dramatic_question:The chapter's central unresolved question/
/emotion_shift:uid:emotion:intensity/   (only after a scene that clearly shifts an NPC's emotional state)
/trust_shift:uid:delta/                  (delta is -25 to +25)
`;
export default preset;
