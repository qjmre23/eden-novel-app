export interface PortraitResult {
  type: 'image' | 'initials';
  src?: string;
  initials?: string;
  color: string;
}

const ROLE_TO_FOLDER: Record<string, string> = {
  mc: 'mc',
  protagonist: 'mc',
  companion: 'companions',
  ally: 'companions',
  villain: 'villains',
  antagonist: 'villains',
  enemy: 'enemies',
  boss: 'bosses',
  npc: 'npcs',
  side_character: 'side_characters',
  faction_leader: 'faction_leaders',
  elite: 'elites',
  soldier: 'soldiers',
  survivor: 'survivors',
  teacher: 'teachers',
  classmate: 'classmates',
  principal: 'principals',
  club_member: 'club_members',
  rival: 'rivals',
  bully: 'bullies',
  love_interest: 'love_interests',
  staff: 'staff',
  parent: 'parents',
  transfer_student: 'transfer_students',
  spirit: 'spirits',
  beast: 'beasts',
  demon: 'demons',
  angel: 'angels',
  sect_elder: 'sect_elders',
  disciple: 'disciples',
  merchant: 'merchants',
  alchemist: 'alchemists',
  array_master: 'array_masters',
  hacker: 'hackers',
  officer: 'officers',
  robot: 'robots',
  corp_agent: 'corp_agents',
  netrunner: 'netrunners',
  street_gang: 'street_gangs',
  merc: 'mercs',
  mage: 'mages',
  knight: 'knights',
  priest: 'priests',
  noble: 'nobles',
  royalty: 'royalty',
  assassin: 'assassins',
  dragon: 'dragons',
  gang_member: 'gang_members',
  criminal: 'criminals',
  informant: 'informants',
  enforcer: 'enforcers',
  underboss: 'underbosses',
  police: 'police',
  lawyer: 'lawyers',
  corrupt_official: 'corrupt_officials',
  family: 'family',
  friend: 'friends',
  ex: 'exes',
  mentor: 'mentors',
  monster: 'monsters',
  cultist: 'cultists',
  paranormal: 'paranormal',
  investigator: 'investigators',
  victim: 'victims',
  possessed: 'possessed',
  detective: 'detectives',
  suspect: 'suspects',
  witness: 'witnesses',
  alien: 'aliens',
  pilot: 'pilots',
  engineer: 'engineers',
  diplomat: 'diplomats',
  general: 'generals',
  medic: 'medics',
  sniper: 'snipers',
  civilian: 'civilians',
  spy: 'spies',
  prisoner: 'prisoners',
  raider: 'raiders',
  refugee: 'refugees',
  leader: 'leaders',
  child: 'children',
  scientist: 'scientists',
  doctor: 'doctors',
  infected: 'infected',
  mutant: 'mutants',
  militia: 'militia',
  scholar: 'scholars',
  servant: 'servants',
  wildlife: 'wildlife',
  trader: 'traders',
  hunter: 'hunters',
  scout: 'scouts',
  hero: 'heroes',
  antihero: 'antiheroes',
  organization_agent: 'organization_agents',
  trainer: 'trainers',
  god: 'gods',
  guide: 'guides',
  summoner: 'summoners',
  vampire: 'vampires',
  hunter_vampire: 'hunters',
  thrall: 'thralls',
  werewolf: 'werewolves',
  witch: 'witches',
  human: 'humans',
  half_blood: 'half_bloods',
  coworker: 'coworkers',
  neighbor: 'neighbors',
  shopkeeper: 'shopkeepers',
  agent: 'agents',
  target: 'targets',
  politician: 'politicians',
  femme_fatale: 'femme_fatales',
};

const PORTRAIT_COLORS_BY_GENDER: Record<string, string[]> = {
  male: ['#1a3a5c', '#1a4a2a', '#2a1a3a', '#2a2a1a', '#1a2a3a', '#3a1a1a', '#1a1a3a'],
  female: ['#3a1a2a', '#2a1a3a', '#1a2a2a', '#3a2a1a', '#1a3a2a', '#2a3a1a', '#3a1a3a'],
  unknown: ['#2a2a2a', '#1a2a1a', '#2a1a2a', '#1a1a2a', '#2a2a1a', '#1a2a2a', '#2a1a1a'],
};

const assignedPortraitsCache = new Map<number, Set<string>>();

const ALL_PORTRAIT_ASSETS = import.meta.glob(
  '/public/portraits/**/*.png',
  { eager: false, as: 'url' }
);

function getPortraitPathsForFolder(genre: string, roleFolder: string): string[] {
  const prefix = `/public/portraits/${genre}/${roleFolder}/`;
  return Object.keys(ALL_PORTRAIT_ASSETS).filter(path => path.startsWith(prefix));
}

function hashStringToIndex(str: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getPortraitColor(gender: string, uid: string): string {
  const colors = PORTRAIT_COLORS_BY_GENDER[gender] ?? PORTRAIT_COLORS_BY_GENDER.unknown;
  return colors[hashStringToIndex(uid, colors.length)];
}

export async function assignPortrait(
  novelId: number,
  characterUid: string,
  characterName: string,
  gender: string,
  role: string,
  genre: string,
  existingPortraitPath?: string | null
): Promise<PortraitResult> {
  const color = getPortraitColor(gender, characterUid);

  if (existingPortraitPath) {
    const loadFn = ALL_PORTRAIT_ASSETS[existingPortraitPath];
    if (loadFn) {
      try {
        const imageUrl = await (loadFn as () => Promise<string>)();
        if (imageUrl) return { type: 'image', src: imageUrl, color };
      } catch { /* fallback */ }
    }
    return { type: 'image', src: existingPortraitPath, color };
  }

  const roleFolder = ROLE_TO_FOLDER[role.toLowerCase()] ?? (gender === 'female' ? 'female' : gender === 'male' ? 'male' : 'npcs');
  const portraitPaths = getPortraitPathsForFolder(genre, roleFolder);

  let availablePaths = portraitPaths;
  if (availablePaths.length === 0) {
    availablePaths = getPortraitPathsForFolder(genre, gender === 'female' ? 'female' : 'male');
  }
  if (availablePaths.length === 0) {
    availablePaths = getPortraitPathsForFolder(genre, 'npcs');
  }

  if (availablePaths.length === 0) {
    return { type: 'initials', initials: getInitials(characterName), color };
  }

  if (!assignedPortraitsCache.has(novelId)) {
    try {
      const { db } = await import('../database/db');
      const chars = await db.characters.where('novel_id').equals(novelId).toArray();
      const assigned = new Set(chars.map(c => c.portrait_path).filter(Boolean) as string[]);
      assignedPortraitsCache.set(novelId, assigned);
    } catch {
      assignedPortraitsCache.set(novelId, new Set());
    }
  }

  const assigned = assignedPortraitsCache.get(novelId)!;
  const unassigned = availablePaths.filter(p => !assigned.has(p));

  const pool = unassigned.length > 0 ? unassigned : availablePaths;
  const selectedPath = pool[Math.floor(Math.random() * pool.length)];

  assigned.add(selectedPath);

  const loadFn = ALL_PORTRAIT_ASSETS[selectedPath];
  try {
    const imageUrl = loadFn ? await (loadFn as () => Promise<string>)() : null;
    if (imageUrl) {
      return { type: 'image', src: imageUrl, color };
    }
  } catch { /* fallback */ }

  return { type: 'initials', initials: getInitials(characterName), color };
}

export function clearPortraitCache(novelId: number): void {
  assignedPortraitsCache.delete(novelId);
}

export function assignBubbleColor(index: number): string {
  const BUBBLE_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#ec4899', '#6366f1', '#84cc16'];
  return BUBBLE_COLORS[index % BUBBLE_COLORS.length];
}
