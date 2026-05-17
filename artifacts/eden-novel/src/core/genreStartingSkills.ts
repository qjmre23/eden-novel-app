export interface StartingSkillDef {
  name: string;
  description: string;
  icon: string;
  defaultVal: number;
  max: number;
}

export const GENRE_STARTING_SKILLS: Record<string, StartingSkillDef[]> = {
  zombie: [
    { name: 'Agility', description: 'Speed and nimbleness in dangerous situations', icon: '🏃', defaultVal: 0, max: 30 },
    { name: 'Strength', description: 'Raw physical power for melee and heavy lifting', icon: '💪', defaultVal: 0, max: 30 },
    { name: 'Endurance', description: 'Stamina and resistance to exhaustion', icon: '🛡️', defaultVal: 0, max: 30 },
    { name: 'Stealth', description: 'Ability to move silently and avoid detection', icon: '🤫', defaultVal: 0, max: 30 },
    { name: 'Marksmanship', description: 'Accuracy with ranged weapons', icon: '🎯', defaultVal: 0, max: 30 },
    { name: 'Survival Instinct', description: 'Natural danger sense and resource awareness', icon: '🧠', defaultVal: 0, max: 30 },
    { name: 'Medical Knowledge', description: 'Treating wounds and managing infections', icon: '🩺', defaultVal: 0, max: 30 },
    { name: 'Scavenging', description: 'Finding useful items in ruins', icon: '🔦', defaultVal: 0, max: 30 },
  ],
  cultivation: [
    { name: 'Spiritual Aptitude', description: 'Natural talent for absorbing spiritual energy', icon: '⚡', defaultVal: 0, max: 30 },
    { name: 'Body Cultivation', description: 'Physical tempering for stronger foundations', icon: '💪', defaultVal: 0, max: 30 },
    { name: 'Dao Comprehension', description: 'Understanding of universal principles and laws', icon: '☯️', defaultVal: 0, max: 30 },
    { name: 'Mental Fortitude', description: 'Resistance to mental attacks and soul pressure', icon: '🧠', defaultVal: 0, max: 30 },
    { name: 'Alchemy Affinity', description: 'Talent for refining pills and potions', icon: '⚗️', defaultVal: 0, max: 30 },
    { name: 'Formation Mastery', description: 'Understanding of arrays and spiritual formations', icon: '🔯', defaultVal: 0, max: 30 },
    { name: 'Combat Technique', description: 'Martial arts and battle experience', icon: '⚔️', defaultVal: 0, max: 30 },
    { name: 'Divine Sense', description: 'Perception beyond physical limitations', icon: '👁️', defaultVal: 0, max: 30 },
  ],
  school: [
    { name: 'Academic Intelligence', description: 'Aptitude for studying and examinations', icon: '📚', defaultVal: 0, max: 30 },
    { name: 'Social Charisma', description: 'Natural likability and charm with peers', icon: '😊', defaultVal: 0, max: 30 },
    { name: 'Athletic Prowess', description: 'Physical fitness and sporting ability', icon: '🏃', defaultVal: 0, max: 30 },
    { name: 'Leadership', description: 'Ability to inspire and organize groups', icon: '👑', defaultVal: 0, max: 30 },
    { name: 'Artistic Talent', description: 'Creative skills in music, art, or performance', icon: '🎨', defaultVal: 0, max: 30 },
    { name: 'Emotional Intelligence', description: 'Reading people and navigating relationships', icon: '💭', defaultVal: 0, max: 30 },
    { name: 'Street Smarts', description: 'Practical knowledge beyond textbooks', icon: '🧠', defaultVal: 0, max: 30 },
    { name: 'Club Influence', description: 'Reputation within extracurricular activities', icon: '⭐', defaultVal: 0, max: 30 },
  ],
  cyberpunk: [
    { name: 'Neural Speed', description: 'Processing speed of cybernetic neural implants', icon: '🧠', defaultVal: 0, max: 30 },
    { name: 'Hacking', description: 'Breaching and manipulating digital systems', icon: '💻', defaultVal: 0, max: 30 },
    { name: 'Reflex Augmentation', description: 'Combat reaction speed via implants', icon: '⚡', defaultVal: 0, max: 30 },
    { name: 'Street Cred', description: 'Reputation in the underground and black market', icon: '🌃', defaultVal: 0, max: 30 },
    { name: 'Weapon Proficiency', description: 'Skill with firearms and melee weapons', icon: '🔫', defaultVal: 0, max: 30 },
    { name: 'Stealth Protocol', description: 'Avoiding corporate surveillance and enemies', icon: '🤫', defaultVal: 0, max: 30 },
    { name: 'Engineering', description: 'Building and maintaining tech and implants', icon: '🔧', defaultVal: 0, max: 30 },
    { name: 'Charisma', description: 'Persuasion in a world run by deals', icon: '💬', defaultVal: 0, max: 30 },
  ],
  fantasy: [
    { name: 'Mana Affinity', description: 'Natural resonance with magical energies', icon: '✨', defaultVal: 0, max: 30 },
    { name: 'Swordsmanship', description: 'Skill with bladed weapons in combat', icon: '⚔️', defaultVal: 0, max: 30 },
    { name: 'Elemental Control', description: 'Affinity for fire, water, earth, or air magic', icon: '🌪️', defaultVal: 0, max: 30 },
    { name: 'Physical Endurance', description: 'Stamina in long battles and harsh conditions', icon: '🛡️', defaultVal: 0, max: 30 },
    { name: 'Arcane Knowledge', description: 'Theoretical understanding of magic systems', icon: '📜', defaultVal: 0, max: 30 },
    { name: 'Stealth & Agility', description: 'Moving silently and avoiding detection', icon: '🌑', defaultVal: 0, max: 30 },
    { name: 'Leadership Aura', description: 'Inspiring allies and commanding respect', icon: '👑', defaultVal: 0, max: 30 },
    { name: 'Perception', description: 'Detecting traps, illusions, and hidden enemies', icon: '👁️', defaultVal: 0, max: 30 },
  ],
  mafia: [
    { name: 'Combat Skill', description: 'Street fighting and weapon proficiency', icon: '✊', defaultVal: 0, max: 30 },
    { name: 'Intimidation', description: 'Projecting fear and dominance', icon: '😤', defaultVal: 0, max: 30 },
    { name: 'Negotiation', description: 'Making deals and finding leverage', icon: '🤝', defaultVal: 0, max: 30 },
    { name: 'Street Network', description: 'Connections and informants across the city', icon: '🕸️', defaultVal: 0, max: 30 },
    { name: 'Loyalty Management', description: 'Building and testing crew loyalty', icon: '❤️', defaultVal: 0, max: 30 },
    { name: 'Cunning', description: 'Planning ambushes and outmaneuvering enemies', icon: '🧠', defaultVal: 0, max: 30 },
    { name: 'Charisma', description: 'Commanding presence and persuasion', icon: '💬', defaultVal: 0, max: 30 },
    { name: 'Survival Instinct', description: 'Reading danger before it strikes', icon: '🎯', defaultVal: 0, max: 30 },
  ],
  romance: [
    { name: 'Empathy', description: 'Understanding and feeling others\' emotions', icon: '💖', defaultVal: 0, max: 30 },
    { name: 'Charisma', description: 'Natural charm and magnetic personality', icon: '✨', defaultVal: 0, max: 30 },
    { name: 'Communication', description: 'Expressing feelings and listening well', icon: '💬', defaultVal: 0, max: 30 },
    { name: 'Patience', description: 'Allowing relationships to grow naturally', icon: '🌱', defaultVal: 0, max: 30 },
    { name: 'Appearance', description: 'Physical attractiveness and grooming', icon: '🌸', defaultVal: 0, max: 30 },
    { name: 'Intuition', description: 'Reading between the lines of social cues', icon: '🧠', defaultVal: 0, max: 30 },
    { name: 'Romantic Creativity', description: 'Planning memorable moments and surprises', icon: '🎁', defaultVal: 0, max: 30 },
    { name: 'Emotional Stability', description: 'Handling heartbreak and drama with grace', icon: '🛡️', defaultVal: 0, max: 30 },
  ],
  horror: [
    { name: 'Sanity Resistance', description: 'Mental toughness against supernatural horror', icon: '🧠', defaultVal: 0, max: 30 },
    { name: 'Stealth', description: 'Moving silently to avoid monsters', icon: '🤫', defaultVal: 0, max: 30 },
    { name: 'Perception', description: 'Sensing danger and hidden threats', icon: '👁️', defaultVal: 0, max: 30 },
    { name: 'Occult Knowledge', description: 'Understanding of supernatural entities and rituals', icon: '🔮', defaultVal: 0, max: 30 },
    { name: 'Physical Endurance', description: 'Surviving injuries and exhaustion', icon: '💪', defaultVal: 0, max: 30 },
    { name: 'Combat Instinct', description: 'Fighting back when cornered', icon: '⚔️', defaultVal: 0, max: 30 },
    { name: 'Problem Solving', description: 'Finding escape routes and solutions under pressure', icon: '🔦', defaultVal: 0, max: 30 },
    { name: 'Luck', description: 'The universe\'s favor in dire moments', icon: '🍀', defaultVal: 0, max: 30 },
  ],
  detective: [
    { name: 'Deduction', description: 'Connecting clues and reaching logical conclusions', icon: '🔍', defaultVal: 0, max: 30 },
    { name: 'Observation', description: 'Noticing details others overlook', icon: '👁️', defaultVal: 0, max: 30 },
    { name: 'Interrogation', description: 'Extracting information from reluctant witnesses', icon: '💬', defaultVal: 0, max: 30 },
    { name: 'Combat Training', description: 'Self-defense in dangerous situations', icon: '✊', defaultVal: 0, max: 30 },
    { name: 'Network Contacts', description: 'Informants across law enforcement and underworld', icon: '🕸️', defaultVal: 0, max: 30 },
    { name: 'Forensics', description: 'Reading crime scenes and physical evidence', icon: '🧪', defaultVal: 0, max: 30 },
    { name: 'Disguise & Infiltration', description: 'Going undercover without detection', icon: '🎭', defaultVal: 0, max: 30 },
    { name: 'Legal Expertise', description: 'Knowledge of law and procedure', icon: '⚖️', defaultVal: 0, max: 30 },
  ],
  space_scifi: [
    { name: 'Piloting', description: 'Flying ships in space combat and navigation', icon: '🚀', defaultVal: 0, max: 30 },
    { name: 'Engineering', description: 'Repairing and modifying spacecraft systems', icon: '🔧', defaultVal: 0, max: 30 },
    { name: 'Combat Training', description: 'Zero-G and conventional combat skill', icon: '⚔️', defaultVal: 0, max: 30 },
    { name: 'Neural Interface', description: 'Synchronizing with ship and station systems', icon: '🧠', defaultVal: 0, max: 30 },
    { name: 'Xenobiology', description: 'Understanding alien life forms and cultures', icon: '👽', defaultVal: 0, max: 30 },
    { name: 'Tactical Command', description: 'Leading crew and making strategic decisions', icon: '📡', defaultVal: 0, max: 30 },
    { name: 'Stealth Systems', description: 'Operating in sensor-dark environments', icon: '🌑', defaultVal: 0, max: 30 },
    { name: 'Diplomacy', description: 'Negotiating with alien factions and empires', icon: '🤝', defaultVal: 0, max: 30 },
  ],
  military_war: [
    { name: 'Combat Proficiency', description: 'Effectiveness in direct combat', icon: '⚔️', defaultVal: 0, max: 30 },
    { name: 'Tactical Thinking', description: 'Planning and adapting battle strategies', icon: '🗺️', defaultVal: 0, max: 30 },
    { name: 'Physical Fitness', description: 'Endurance for long marches and battles', icon: '💪', defaultVal: 0, max: 30 },
    { name: 'Leadership', description: 'Commanding soldiers and inspiring under fire', icon: '👑', defaultVal: 0, max: 30 },
    { name: 'Marksmanship', description: 'Accuracy with ranged weapons', icon: '🎯', defaultVal: 0, max: 30 },
    { name: 'Stealth & Recon', description: 'Infiltrating enemy lines undetected', icon: '🤫', defaultVal: 0, max: 30 },
    { name: 'Explosives', description: 'Handling demolitions and traps', icon: '💣', defaultVal: 0, max: 30 },
    { name: 'Field Medicine', description: 'Treating battlefield wounds under fire', icon: '🩺', defaultVal: 0, max: 30 },
  ],
  apocalypse: [
    { name: 'Survival Skills', description: 'Finding food, water, and shelter', icon: '🌲', defaultVal: 0, max: 30 },
    { name: 'Combat', description: 'Fighting hostile survivors and threats', icon: '⚔️', defaultVal: 0, max: 30 },
    { name: 'Leadership', description: 'Organizing and protecting a group', icon: '👑', defaultVal: 0, max: 30 },
    { name: 'Resource Management', description: 'Rationing supplies and tracking inventory', icon: '📦', defaultVal: 0, max: 30 },
    { name: 'Engineering & Crafting', description: 'Building fortifications and tools', icon: '🔧', defaultVal: 0, max: 30 },
    { name: 'Medical', description: 'Treating injuries without modern medicine', icon: '🩺', defaultVal: 0, max: 30 },
    { name: 'Persuasion', description: 'Convincing strangers to cooperate', icon: '💬', defaultVal: 0, max: 30 },
    { name: 'Scavenging', description: 'Finding supplies in collapsed civilization', icon: '🔦', defaultVal: 0, max: 30 },
  ],
  historical: [
    { name: 'Swordsmanship', description: 'Mastery of blades and historical weapons', icon: '⚔️', defaultVal: 0, max: 30 },
    { name: 'Political Acumen', description: 'Navigating court politics and power', icon: '👑', defaultVal: 0, max: 30 },
    { name: 'Scholarly Knowledge', description: 'History, philosophy, and classical texts', icon: '📜', defaultVal: 0, max: 30 },
    { name: 'Charisma', description: 'Noble bearing and inspiring loyalty', icon: '✨', defaultVal: 0, max: 30 },
    { name: 'Military Strategy', description: 'Commanding armies and siege tactics', icon: '🗺️', defaultVal: 0, max: 30 },
    { name: 'Archery', description: 'Skill with bows and ranged weapons', icon: '🏹', defaultVal: 0, max: 30 },
    { name: 'Espionage', description: 'Gathering intelligence and running spies', icon: '🕵️', defaultVal: 0, max: 30 },
    { name: 'Diplomacy', description: 'Negotiating treaties and alliances', icon: '🤝', defaultVal: 0, max: 30 },
  ],
  survival: [
    { name: 'Foraging', description: 'Finding edible plants and fresh water', icon: '🌿', defaultVal: 0, max: 30 },
    { name: 'Hunting', description: 'Tracking and catching animals for food', icon: '🏹', defaultVal: 0, max: 30 },
    { name: 'Fire Making', description: 'Starting and maintaining fires in any conditions', icon: '🔥', defaultVal: 0, max: 30 },
    { name: 'Navigation', description: 'Finding direction without tools', icon: '🧭', defaultVal: 0, max: 30 },
    { name: 'Shelter Building', description: 'Constructing protection from the elements', icon: '🏠', defaultVal: 0, max: 30 },
    { name: 'Physical Endurance', description: 'Pushing through exhaustion and hardship', icon: '💪', defaultVal: 0, max: 30 },
    { name: 'First Aid', description: 'Treating injuries with natural materials', icon: '🩺', defaultVal: 0, max: 30 },
    { name: 'Crafting', description: 'Making tools and weapons from nature', icon: '🔧', defaultVal: 0, max: 30 },
  ],
  superpower: [
    { name: 'Power Intensity', description: 'Raw strength of your innate ability', icon: '⚡', defaultVal: 0, max: 30 },
    { name: 'Power Control', description: 'Precision and restraint in using your power', icon: '🎯', defaultVal: 0, max: 30 },
    { name: 'Combat Training', description: 'Hand-to-hand fighting beyond your power', icon: '✊', defaultVal: 0, max: 30 },
    { name: 'Speed', description: 'Movement speed and reaction time', icon: '🏃', defaultVal: 0, max: 30 },
    { name: 'Durability', description: 'Resistance to physical damage', icon: '🛡️', defaultVal: 0, max: 30 },
    { name: 'Tactical Mind', description: 'Analyzing enemy weaknesses mid-combat', icon: '🧠', defaultVal: 0, max: 30 },
    { name: 'Heroic Aura', description: 'Inspiring allies and shaking enemies\' resolve', icon: '✨', defaultVal: 0, max: 30 },
    { name: 'Stamina', description: 'Sustaining power use without burning out', icon: '💪', defaultVal: 0, max: 30 },
  ],
  isekai: [
    { name: 'Magic Affinity', description: 'Natural talent for the new world\'s magic', icon: '✨', defaultVal: 0, max: 30 },
    { name: 'Adaptability', description: 'Learning the rules of the new world quickly', icon: '🧠', defaultVal: 0, max: 30 },
    { name: 'Combat Skill', description: 'Fighting ability in the new world\'s system', icon: '⚔️', defaultVal: 0, max: 30 },
    { name: 'Unique Skill', description: 'Overpowered ability brought from original world', icon: '⚡', defaultVal: 0, max: 30 },
    { name: 'Luck', description: 'Blessed by the world itself for extraordinary fortune', icon: '🍀', defaultVal: 0, max: 30 },
    { name: 'Charisma', description: 'Making allies in an unfamiliar world', icon: '💬', defaultVal: 0, max: 30 },
    { name: 'Crafting Knowledge', description: 'Modern knowledge applied to medieval crafts', icon: '🔧', defaultVal: 0, max: 30 },
    { name: 'Party Leadership', description: 'Rallying companions and managing a team', icon: '👑', defaultVal: 0, max: 30 },
  ],
  vampire: [
    { name: 'Blood Potency', description: 'Raw strength of your vampiric bloodline', icon: '🩸', defaultVal: 0, max: 30 },
    { name: 'Speed & Agility', description: 'Supernatural movement speed', icon: '💨', defaultVal: 0, max: 30 },
    { name: 'Domination', description: 'Psychic influence over mortals and lesser undead', icon: '👁️', defaultVal: 0, max: 30 },
    { name: 'Stealth', description: 'Blending into shadow and moving unseen', icon: '🌑', defaultVal: 0, max: 30 },
    { name: 'Combat Mastery', description: 'Centuries of refined fighting technique', icon: '⚔️', defaultVal: 0, max: 30 },
    { name: 'Feeding Control', description: 'Resisting blood frenzy and managing hunger', icon: '🌹', defaultVal: 0, max: 30 },
    { name: 'Political Standing', description: 'Position within vampire society hierarchy', icon: '👑', defaultVal: 0, max: 30 },
    { name: 'Sun Resistance', description: 'Reduced vulnerability to daylight', icon: '☀️', defaultVal: 0, max: 30 },
  ],
  slice_of_life: [
    { name: 'Social Skills', description: 'Building and maintaining friendships', icon: '😊', defaultVal: 0, max: 30 },
    { name: 'Hobbies & Interests', description: 'Depth in personal passions and crafts', icon: '🎨', defaultVal: 0, max: 30 },
    { name: 'Emotional Maturity', description: 'Handling life\'s ups and downs with grace', icon: '💖', defaultVal: 0, max: 30 },
    { name: 'Work Ethic', description: 'Dedication to goals and daily responsibilities', icon: '💼', defaultVal: 0, max: 30 },
    { name: 'Cooking & Homemaking', description: 'Creating warmth through domestic skills', icon: '🍳', defaultVal: 0, max: 30 },
    { name: 'Empathy', description: 'Understanding others\' struggles and joys', icon: '💭', defaultVal: 0, max: 30 },
    { name: 'Communication', description: 'Expressing yourself authentically', icon: '💬', defaultVal: 0, max: 30 },
    { name: 'Curiosity', description: 'Openness to new experiences and learning', icon: '🌟', defaultVal: 0, max: 30 },
  ],
  thriller: [
    { name: 'Threat Assessment', description: 'Quickly evaluating danger levels', icon: '👁️', defaultVal: 0, max: 30 },
    { name: 'Combat', description: 'Fighting off threats when cornered', icon: '✊', defaultVal: 0, max: 30 },
    { name: 'Deception', description: 'Lying convincingly and maintaining cover', icon: '🎭', defaultVal: 0, max: 30 },
    { name: 'Survival Instinct', description: 'Trusting your gut when logic fails', icon: '🧠', defaultVal: 0, max: 30 },
    { name: 'Technical Skills', description: 'Hacking, bypassing security, and surveillance', icon: '💻', defaultVal: 0, max: 30 },
    { name: 'Network & Contacts', description: 'People who can help when things go wrong', icon: '🕸️', defaultVal: 0, max: 30 },
    { name: 'Endurance', description: 'Physical and mental stamina under extreme pressure', icon: '💪', defaultVal: 0, max: 30 },
    { name: 'Precision', description: 'Accuracy and careful execution under stress', icon: '🎯', defaultVal: 0, max: 30 },
  ],
  crime_noir: [
    { name: 'Street Smarts', description: 'Reading the city and its dangerous people', icon: '🌃', defaultVal: 0, max: 30 },
    { name: 'Deduction', description: 'Putting together the grim truth from fragments', icon: '🔍', defaultVal: 0, max: 30 },
    { name: 'Combat', description: 'Dirty fighting in dark alleys', icon: '✊', defaultVal: 0, max: 30 },
    { name: 'Intimidation', description: 'Making people talk when they don\'t want to', icon: '😤', defaultVal: 0, max: 30 },
    { name: 'Connections', description: 'Informants across cops and criminals alike', icon: '🕸️', defaultVal: 0, max: 30 },
    { name: 'Deception', description: 'Playing multiple sides without getting burned', icon: '🎭', defaultVal: 0, max: 30 },
    { name: 'Endurance', description: 'Surviving in a world that wants you gone', icon: '💪', defaultVal: 0, max: 30 },
    { name: 'Marksmanship', description: 'Accurate shooting in low-light situations', icon: '🎯', defaultVal: 0, max: 30 },
  ],
};

export const MC_TRAITS = {
  personality: [
    'Calm & Collected',
    'Aggressive & Hot-headed',
    'Calculating & Strategic',
    'Reckless & Impulsive',
    'Reserved & Introverted',
    'Charismatic & Outgoing',
    'Mysterious & Enigmatic',
    'Gentle & Compassionate',
    'Arrogant & Overconfident',
    'Humble & Self-doubting',
  ],
  attitude: [
    'Respectful to all',
    'Snarky & Sarcastic',
    'Blunt & Direct',
    'Foul-mouthed & Crude',
    'Formal & Polite',
    'Casual & Laid-back',
    'Cold & Dismissive',
    'Warm & Friendly',
    'Cocky & Provocative',
    'Passive-aggressive',
  ],
  riskTolerance: [
    'Reckless — charges in without thinking',
    'Calculated risk-taker — weighs odds carefully',
    'Cautious — prefers safe options',
    'Cowardly — avoids danger at all costs',
    'Fearless — genuinely feels no fear',
    'Adaptive — reads the situation first',
  ],
  altruism: [
    'Selfless — puts others before self',
    'Helpful — assists when it\'s convenient',
    'Neutral — does what benefits the group',
    'Self-interested — prioritizes own survival',
    'Cold & Detached — doesn\'t get involved',
    'Protective — fiercely guards close allies only',
  ],
};

export const INITIAL_SKILL_POINTS = 5;
export const MAX_SKILL_VALUE = 30;

export interface MCTraits {
  personality: string;
  attitude: string;
  riskTolerance: string;
  altruism: string;
}

export interface StartingSkillAllocation {
  name: string;
  value: number;
  isCustom?: boolean;
}
