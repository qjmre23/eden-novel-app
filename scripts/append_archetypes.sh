#!/usr/bin/env bash
set -e
PRESETS_DIR="$(cd "$(dirname "$0")/.." && pwd)/artifacts/eden-novel/src/presets"

append_archetype() {
  local file="$1"
  local block="$2"
  local path="$PRESETS_DIR/$file"
  python3 - "$path" "$block" <<'PY'
import sys, pathlib
path = pathlib.Path(sys.argv[1])
block = sys.argv[2]
text = path.read_text(encoding='utf-8')
marker = '`;\n\nexport default preset;'
if marker not in text:
    # Try without trailing newline variant
    marker = '`;\nexport default preset;'
if marker not in text:
    raise SystemExit(f'Marker not found in {path.name}')
new = text.replace(marker, '\n\n' + block + '\n' + marker, 1)
path.write_text(new, encoding='utf-8')
PY
}

# === Archetype libraries (one per genre) ===

read -r -d '' ZOMBIE <<'BLOCK' || true
ZOMBIE GENRE — NPC ARCHETYPE LIBRARY:
When creating new characters in this genre, draw from these psychologically rich archetypes:

- THE PRAGMATIST: Does monstrous things for survival. Genuinely believes kindness is a death sentence. Not a villain — a cautionary mirror.
- THE PROTECTOR: Has chosen one person to keep alive at any cost. Will destroy anyone who threatens that person. Their love is their most dangerous trait.
- THE DENIER: Refuses to accept the world has changed. Recreates pre-apocalypse rituals. The cracks in their facade are heartbreaking.
- THE FORMER SOLDIER: Competent but traumatized. Takes orders better than giving them. Has something they did in the early days they haven't told anyone.
- THE CHILD: Born into this world. Has no grief for what was lost. Sees the MC's trauma as weakness. More adapted than any adult.
- THE SCIENTIST: Believes the answer is out there. Uses people as means to ends. Not evil — consumed.

When introducing NPCs, give them a hidden dimension that doesn't appear in their first scene.
BLOCK

read -r -d '' APOCALYPSE <<'BLOCK' || true
APOCALYPSE GENRE — NPC ARCHETYPE LIBRARY:
- THE PROPHET: Believes they predicted this, even if they didn't. Builds followers from despair. Knows fear is the only currency that hasn't crashed.
- THE LAST PROFESSIONAL: Still wears their old uniform — doctor, cop, teacher. The ritual is the only thing holding them together.
- THE BARGAINER: Will trade anything for anything. Has a tally in their head of every life they've sold. They no longer wince when they write a name.
- THE FERAL OPTIMIST: Smiles through the worst. Their hope is a survival mechanism, not a virtue.
- THE OBSERVER: Records everything in a notebook for a future that may never come. The notebook itself is sacred — touch it and they break.
- THE INHERITOR: Born after the fall, indifferent to the world that ended. Speaks of "before" the way the MC speaks of fairy tales.
BLOCK

read -r -d '' CULTIVATION <<'BLOCK' || true
CULTIVATION GENRE — NPC ARCHETYPE LIBRARY:
- THE BROKEN ELDER: Powerful, ancient, and wrong about everything. Their dao crystallized centuries ago and the world has moved on.
- THE RIVAL HEIR: Talented, polished, and rotting from within. Their family's expectations are a slow poison.
- THE SECT POLITICIAN: Smiles in every direction. Their qi feels clean only because they bury everything that isn't.
- THE OUTSIDER PROPHET: A wandering nameless cultivator who sees patterns the orthodox sects refuse to. Treated as a heretic, often correct.
- THE SERVANT WITH A SWORD: Apparent menial whose cultivation is hidden. Their loyalty is to a person, not a sect.
- THE DEMON IN HUMAN SHAPE: Charming, helpful, generous — and feeding on the spiritual energy of those who trust them.
BLOCK

read -r -d '' CYBERPUNK <<'BLOCK' || true
CYBERPUNK GENRE — NPC ARCHETYPE LIBRARY:
- THE GHOST IN THE WIRE: Lives more in the net than in their body. Distrusts meat-space. Their cynicism is curated, not natural.
- THE BURNED FIXER: Used to broker the city. One bad job. Now they only handle things below the corporate radar.
- THE LOYAL THUG: Will die for the gang because the gang is the only family they've had. Their loyalty is the only honest thing in the city.
- THE CORPORATE FUGITIVE: On the run from a contract. Smiles too easily. Will betray the MC the second their old life calls.
- THE STREET-DOC: Practices outlawed medicine for cred and conscience. The conscience is winning, slowly.
- THE PROTOTYPE: An augmented person who is not sure how much of them is still them. Asks questions no one wants to answer.
BLOCK

read -r -d '' FANTASY <<'BLOCK' || true
FANTASY GENRE — NPC ARCHETYPE LIBRARY:
- THE KING WITH A CRACKED CROWN: Wields authority that no longer fits the world. Knows it. Wears the crown anyway.
- THE EXILED MAGE: Carries forbidden knowledge that the present age has decided to forget. Their loneliness is centuries old.
- THE FAITHFUL SWORD: Loyal to a dead lord. Lives by an obsolete oath. Stronger for it, lonelier for it.
- THE TRICKSTER MERCHANT: Trades fairly only with those who recognize the trick. Their fairness is a weapon.
- THE BLOOD-OATH HEIR: Bound by an inherited promise they did not make. The promise is killing them slowly.
- THE WORLD-WALKER: Knows the rules of this world are not the only rules. Suspect to everyone, useful to most.
BLOCK

read -r -d '' MAFIA <<'BLOCK' || true
MAFIA GENRE — NPC ARCHETYPE LIBRARY:
- THE CAPO WITH A CONSCIENCE: Loves the family but hates the work. Drinks more than they say. Will protect the MC right up until the moment the family demands otherwise.
- THE OUTSIDER CONSIGLIERE: Adopted into the family young. More loyal than blood — and more dangerous for it.
- THE COUSIN WHO TALKS TOO MUCH: A liability. Funny. Doomed. Knows it.
- THE WIDOW: Inherited authority she did not want. Smarter than every man in the room. Patient as winter.
- THE PROSECUTOR'S INSIDER: Working with the law. Sweats at every dinner. Has a child to protect.
- THE BUTCHER: The family's instrument. Sleeps fine. Sometimes paints.
BLOCK

read -r -d '' ROMANCE <<'BLOCK' || true
ROMANCE GENRE — NPC ARCHETYPE LIBRARY:
- THE GUARDED ONE: Smiles easily but never opens. Their warmth is a perimeter. Whoever crosses it triggers their oldest fear.
- THE PAST LOVE: Returned without warning. Still beautiful. Still wrong. Knows exactly where the MC is weakest.
- THE BEST FRIEND WHO LOVES SECRETLY: Watches every interaction with a quiet ache. Will choose the MC's happiness over their own — once.
- THE INTERLOPER: Confident, generous, kind. Their kindness is real. So is the threat they pose to the existing bond.
- THE FAMILY OBSTACLE: A parent, sibling, or guardian whose objection is not unreasonable, just inconvenient.
- THE RIVAL FOR THE LOVE INTEREST: Talented, attractive, and the kind of person the MC would be friends with in any other context.
BLOCK

read -r -d '' HORROR <<'BLOCK' || true
HORROR GENRE — NPC ARCHETYPE LIBRARY:
- THE BELIEVER: Has seen what others refuse to. Speaks calmly because hysteria left them a year ago.
- THE SKEPTIC WHO IS ABOUT TO BE WRONG: Confident, rational, charismatic. Will die mid-sentence.
- THE COMPLICIT NEIGHBOR: Knew. Said nothing. Their fear of the thing exceeds their fear of damnation.
- THE FINAL CHILD: Speaks to the thing as if it were a friend. Frightens the adults more than the thing does.
- THE HUNTER: Crossed too many lines to come back. Useful. Untrustworthy. Sleeping with a knife.
- THE FOLKLORIST: Has the answer in a book they will not open in front of the MC.
BLOCK

read -r -d '' DETECTIVE <<'BLOCK' || true
DETECTIVE GENRE — NPC ARCHETYPE LIBRARY:
- THE WITNESS WHO LIES BY OMISSION: Truthful about facts, dishonest about meaning. Their omission is the case.
- THE COP ON THE OTHER TEAM: Working the same case from a politically opposed angle. The friendliness is real and inadequate.
- THE GRIEVING CLIENT: Hired the MC for a stated reason. The real reason is one they have not admitted to themselves.
- THE FIXER WITH A FILE: Knows where every body is, and which ones are still useful.
- THE SUSPECT WHO LIKES THE MC: Charming, helpful, and almost certainly guilty.
- THE FORENSIC OUTSIDER: Eccentric, brilliant, allergic to authority. Their findings have already cost them a job.
BLOCK

read -r -d '' SPACE_SCIFI <<'BLOCK' || true
SPACE SCI-FI GENRE — NPC ARCHETYPE LIBRARY:
- THE CAPTAIN ON THEIR LAST RUN: One contract from retirement. Has lost too many people to be inspirational.
- THE SHIP'S AI WITH A QUIRK: Functional, polite, and developing a value system the crew has not authorized.
- THE COLONIAL REFUGEE: Watched their world die. Carries the soil of it in a sealed jar.
- THE ALIEN INTERPRETER: Has spent more time among the other species than their own. No longer sure which side they're translating for.
- THE CORPORATE OBSERVER: Officially neutral. Privately taking notes. Will be the witness at the inquiry.
- THE WAR-DECOMMISSIONED VETERAN: Built to fight a war that ended. Repurposed for peace they no longer fit into.
BLOCK

read -r -d '' MILITARY_WAR <<'BLOCK' || true
MILITARY/WAR GENRE — NPC ARCHETYPE LIBRARY:
- THE NCO WHO RUNS EVERYTHING: Doesn't outrank the MC. Outweighs them. Their respect is harder to earn than any officer's.
- THE OFFICER OUT OF THEIR DEPTH: Trained at the academy for a war the textbook didn't predict. Trying not to break in front of their squad.
- THE MEDIC WHO STOPPED COUNTING: Calm. Dry. Saving people for a reason they no longer articulate.
- THE TRANSLATOR: Native to the war zone, working for the MC's side. Loyalty conditional and earned hourly.
- THE PRISONER: Captured. Cooperative. Wants something the MC's commanders have not authorized.
- THE FATHER-FIGURE WHO WILL DIE: Veteran soldier who has taken the MC under their wing. Mark them at the start of every chapter.
BLOCK

read -r -d '' HISTORICAL <<'BLOCK' || true
HISTORICAL GENRE — NPC ARCHETYPE LIBRARY:
- THE INHERITED ENEMY: Their family has hated the MC's family for generations. Neither of them remembers why. The hatred works fine without a reason.
- THE PRAGMATIC LORD: Will support whichever side wins. Currently mistaken about which side that is.
- THE FORBIDDEN MARRIAGE: Loves someone the era will not allow. Their composure is its own kind of bravery.
- THE FOREIGN MERCHANT: Useful, polite, and judged for their accent in every room they enter.
- THE PRIEST WITH HERESY: Believes something their order does not. Hides it badly. Useful for that reason.
- THE WOMAN BEHIND THE THRONE: Officially has no power. Runs the realm.
BLOCK

read -r -d '' SURVIVAL <<'BLOCK' || true
SURVIVAL GENRE — NPC ARCHETYPE LIBRARY:
- THE LOCAL: Knows the terrain in ways the MC will never match. Their condescension is earned and grating.
- THE OUTSIDER PARTNER: Has resources the local doesn't. Will not last the season without help.
- THE OPPORTUNIST: Watching for the moment the MC is weakest. Friendly until then.
- THE CONSCIENCE: Refuses to do the necessary thing. Beautiful for it. Will probably die first.
- THE BROKEN GUIDE: Used to lead expeditions. Lost a group. The story of what happened changes when they're drunk.
- THE RIVAL TRAVELER: Heading to the same destination for incompatible reasons.
BLOCK

read -r -d '' SUPERPOWER <<'BLOCK' || true
SUPERPOWER GENRE — NPC ARCHETYPE LIBRARY:
- THE MENTOR WHO LOST THEIRS: Powers fading or destroyed. Trains the MC out of envy and tenderness.
- THE GOVERNMENT HANDLER: Officially friendly, contractually predatory. Has a file thicker than any relationship.
- THE PEER WITH A SIMILAR ABILITY: Slightly stronger. Slightly less moral. The MC sees themselves in them and flinches.
- THE CIVILIAN WITNESS: Saw the MC do something inhuman. Has not decided what they're going to do about it.
- THE VILLAIN WITH A POINT: Their methods are monstrous. Their analysis of society is not wrong.
- THE FAMILY MEMBER LEFT BEHIND: Powerless, mortal, in the line of fire because of who the MC is.
BLOCK

read -r -d '' ISEKAI <<'BLOCK' || true
ISEKAI GENRE — NPC ARCHETYPE LIBRARY:
- THE LOCAL FRIEND: Adopts the MC quickly. Their kindness is uncomplicated and the MC distrusts it for it.
- THE FELLOW TRANSPORTED: Arrived years before the MC. Different theory of why they're here. Sometimes correct.
- THE NOBLE WHO RECOGNIZES THE MC IS DIFFERENT: Wants to use the MC's strangeness. Will lie to keep them.
- THE GUILD VETERAN: Tired of new adventurers dying. Trains roughly out of love.
- THE SYSTEM ARCHITECT: Knows the rules the MC sees in floating menus are not the only rules. Their answers are not free.
- THE FORGOTTEN GOD: Worshipped once. Now small, embarrassed, occasionally useful.
BLOCK

read -r -d '' VAMPIRE <<'BLOCK' || true
VAMPIRE GENRE — NPC ARCHETYPE LIBRARY:
- THE ELDER: Centuries old. Bored. Cruel in the way only the bored can be.
- THE TURNED RECENTLY: Still mourning their human life. Still useful for that mourning.
- THE FAMILIAR: Human servant by choice. Their devotion is its own predator.
- THE HUNTER WITH RULES: Will not kill children. Will kill the MC. Their rules are their cathedral.
- THE COVEN POLITICIAN: Smiles in every direction. Their power is who owes whom.
- THE BLOOD-DEPENDENT MORTAL: Addicted to a particular vampire's bite. Functioning. Doomed.
BLOCK

read -r -d '' SCHOOL <<'BLOCK' || true
SCHOOL GENRE — NPC ARCHETYPE LIBRARY:
- THE STUDENT COUNCIL HEAD: Polished, ambitious, terrified of being seen as anything less than competent.
- THE QUIET TOP SCORER: Speaks rarely. Notices everything. Will reveal an inner life when stressed.
- THE TEACHER WITH A SECRET: Loved by students. Hiding something the administration would fire them for.
- THE TROUBLEMAKER: Acts out for reasons more sympathetic than their reputation suggests.
- THE CLUB OUTSIDER: Found community in an activity no one takes seriously. Defends it like family.
- THE TRANSFERRED STUDENT: Arrived this year. Carries the weight of where they came from in their silences.
BLOCK

read -r -d '' SLICE_OF_LIFE <<'BLOCK' || true
SLICE OF LIFE GENRE — NPC ARCHETYPE LIBRARY:
- THE NEIGHBOR WHO REMEMBERS EVERYTHING: Lives nearby. Recalls the MC's history more accurately than the MC does.
- THE COWORKER WHO IS DROWNING: Functional in public. Falling apart in private. The MC is the first to notice.
- THE OLD FRIEND DRIFTING: Used to be close. The friendship has thinned. The next interaction will decide its future.
- THE STRANGER WITH A KINDNESS: Brief, generous, gone. The kindness changes the MC's day in ways they cannot articulate.
- THE FAMILY MEMBER WITH NEW NEWS: Their announcement reshapes the MC's calendar and inner life.
- THE LOCAL FIXTURE: Café owner, bus driver, librarian — the human background of the MC's life, finally pulled into focus.
BLOCK

read -r -d '' THRILLER <<'BLOCK' || true
THRILLER GENRE — NPC ARCHETYPE LIBRARY:
- THE INFORMANT: Useful, frightened, expensive. Their fear is a sensor for danger the MC has not yet detected.
- THE OPPOSITE NUMBER: A professional on the other side. Respects the MC's competence. Will not hesitate.
- THE INNOCENT IN THE WAY: Witnessed something they should not have. Cannot be left where they are.
- THE OLD HANDLER: Brought the MC into this life. Their guilt and pride are inseparable.
- THE MOLE: Loyal-seeming. Has been compromised for years. Almost wants to be caught.
- THE JOURNALIST: Pursuing the story for reasons that are not entirely about the story.
BLOCK

read -r -d '' CRIME_NOIR <<'BLOCK' || true
CRIME NOIR GENRE — NPC ARCHETYPE LIBRARY:
- THE DAME WITH A FILE: Hired the MC under a name that isn't hers. The truth is in the case, not in her.
- THE COP WHO STILL CARES: Burnt out, principled, useful. Their principles are not transferable.
- THE BAR-OWNER WHO HEARS EVERYTHING: Neutral by trade. Will sell information for the right reason, not the right price.
- THE BAGMAN: Carries money for someone else's sins. Knows every body in the river.
- THE PRIEST IN THE WRONG NEIGHBORHOOD: Believes redemption exists in this city. Will be tested.
- THE STREET KID: Sees things adults miss. Sells the information for shoes.
BLOCK

append_archetype "zombie_genre.ts"       "$ZOMBIE"
append_archetype "apocalypse_genre.ts"   "$APOCALYPSE"
append_archetype "cultivation_genre.ts"  "$CULTIVATION"
append_archetype "cyberpunk_genre.ts"    "$CYBERPUNK"
append_archetype "fantasy_genre.ts"      "$FANTASY"
append_archetype "mafia_genre.ts"        "$MAFIA"
append_archetype "romance_genre.ts"      "$ROMANCE"
append_archetype "horror_genre.ts"       "$HORROR"
append_archetype "detective_genre.ts"    "$DETECTIVE"
append_archetype "space_scifi_genre.ts"  "$SPACE_SCIFI"
append_archetype "military_war_genre.ts" "$MILITARY_WAR"
append_archetype "historical_genre.ts"   "$HISTORICAL"
append_archetype "survival_genre.ts"     "$SURVIVAL"
append_archetype "superpower_genre.ts"   "$SUPERPOWER"
append_archetype "isekai_genre.ts"       "$ISEKAI"
append_archetype "vampire_genre.ts"      "$VAMPIRE"
append_archetype "school_genre.ts"       "$SCHOOL"
append_archetype "slice_of_life_genre.ts" "$SLICE_OF_LIFE"
append_archetype "thriller_genre.ts"     "$THRILLER"
append_archetype "crime_noir_genre.ts"   "$CRIME_NOIR"

echo "All 20 genre archetype libraries appended."
