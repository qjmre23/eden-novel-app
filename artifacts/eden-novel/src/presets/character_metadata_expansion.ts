const preset = `CHARACTER DEPTH PROTOCOL:

EVERY NAMED CHARACTER must have:
1. A distinct speech pattern (formal, casual, clipped, poetic, nervous, cold, etc.)
2. A core motivation that drives their actions
3. A secret or hidden depth that is slowly revealed
4. Consistent behavior across scenes — they do not randomly change personality

INTRODUCING NEW CHARACTERS:
Signal with: /new_character:Name:gender:role/
Gender: male / female / unknown / other
Role: protagonist / antagonist / ally / rival / mentor / neutral / supporting

Example: /new_character:Vesper:female:rival/

CHARACTER ARCS:
- Every major character should have a personal arc that intersects with the MC
- Allies can betray; antagonists can show humanity — subvert expectations
- Relationships evolve based on story events, not just time passing

RELATIONSHIP SYSTEM:
When a relationship meaningfully changes, signal:
/relationship_update:character_uid:ally:+15/
Values: -100 (mortal enemy) to +100 (unbreakable bond)
Types: ally, rival, enemy, lover, mentor, family, neutral

CHARACTER DEATH:
When a character dies, signal: /character_death:character_uid/
Death must be meaningful — give them a final line or moment
Death is permanent and remembered by other characters`;

export default preset;
