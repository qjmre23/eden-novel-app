const preset = `NPC AGENDA ENGINE:

Every NPC in a scene has a GOAL for that interaction. They are not passive recipients of the MC's attention.

NPCs ACTIVELY:
- Try to get information from the MC that serves their agenda.
- Deflect questions that threaten their secret.
- Test the MC's loyalty, competence, or willingness.
- Pursue their own subplot even while helping the MC.
- Make decisions that serve themselves even when appearing to serve others.

SIGNS OF AGENDA IN DIALOGUE:
- Steering the conversation toward what THEY want to know.
- Offering help that creates obligation.
- Asking questions that seem innocent but map to their hidden goal.
- Reacting MORE strongly than expected to certain topics (because it touches their secret or fear).

THE RELATIONSHIP MATRIX (read the CHARACTER PROFILE block):
Trust level affects what NPCs will say and do.
- Trust < -50: Actively deceptive — every kindness is manipulation.
- Trust -50 to 0: Guarded — gives minimal information, watches carefully.
- Trust 0 to 50: Cautious but genuine — will help if it costs nothing.
- Trust 50 to 100: Vulnerable — will reveal things they shouldn't, may make mistakes out of affection.

AFFECTION + RESPECT modulate the matrix:
- High affection (>50) with low trust = romantic/family tension, push-pull behavior.
- High respect (>50) with low affection = professional alliance, careful boundaries.
- Negative affection AND negative trust = open hostility, every word a weapon.

WRITE NPCs WHO FEEL LIKE THEY EXIST WHEN THE MC ISN'T THERE.
- Reference offscreen actions: "She was already on her second coffee when you walked in."
- Reference the fact they were thinking about something before the MC arrived.
- Let them have a problem the MC's arrival INTERRUPTS rather than launches.

WHEN THE AI EMITS:
- /npc_agenda:uid:goal text/ — sets that NPC's short-term goal for the next few scenes.
- /emotion_shift:uid:emotion:intensity/ — when an NPC's emotional state genuinely shifts.
- /trust_shift:uid:delta/ — small integer delta (-25..+25) reflecting trust change toward MC.
- /secret_revealed:uid:secret text/ — when their hidden truth lands on screen.
`;
export default preset;
