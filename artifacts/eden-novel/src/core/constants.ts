export const RECOMMENDED_MODELS = [
  { id: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B', description: 'Best quality for long stories', speed: 'Medium', quality: 'Excellent', provider: 'Together.ai' },
  { id: 'meta-llama/Llama-3.1-8B-Instruct', label: 'Llama 3.1 8B', description: 'Fast generation, good quality', speed: 'Fast', quality: 'Good', provider: 'HF Inference' },
  { id: 'google/gemma-3-27b-it', label: 'Gemma 3 27B', description: 'Strong narrative coherence', speed: 'Medium', quality: 'Very Good', provider: 'HF Inference' },
  { id: 'google/gemma-4-31B-it:together', label: 'Gemma 4 31B', description: 'Latest Google model', speed: 'Medium', quality: 'Excellent', provider: 'Together.ai' },
  { id: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen 2.5 72B', description: 'Best for cultivation and isekai genres', speed: 'Medium', quality: 'Excellent', provider: 'Together.ai' },
  { id: 'deepseek-ai/DeepSeek-V3-0324:together', label: 'DeepSeek V3', description: 'Best for very long stories', speed: 'Medium', quality: 'Excellent', provider: 'Together.ai' },
  { id: 'mistralai/Mistral-7B-Instruct-v0.3', label: 'Mistral 7B', description: 'Lightweight and very fast', speed: 'Very Fast', quality: 'Good', provider: 'HF Inference' },
  { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', label: 'Mixtral 8x7B', description: 'Balanced speed and quality', speed: 'Fast', quality: 'Very Good', provider: 'HF Inference' },
];

export const GENRES = [
  { id: 'zombie', name: 'Zombie Apocalypse', icon: '🧟', description: 'Survive the undead outbreak', color: '#4a1942' },
  { id: 'cultivation', name: 'Cultivation', icon: '⚡', description: 'Rise through spiritual realms', color: '#1a3a4a' },
  { id: 'school', name: 'School Life', icon: '🏫', description: 'Navigate academic drama', color: '#1a4a2a' },
  { id: 'cyberpunk', name: 'Cyberpunk', icon: '🤖', description: 'Neon cities and neural implants', color: '#1a1a4a' },
  { id: 'fantasy', name: 'Fantasy', icon: '🐉', description: 'Magic kingdoms and ancient quests', color: '#3a1a4a' },
  { id: 'mafia', name: 'Mafia', icon: '🔫', description: 'Power, loyalty, and betrayal', color: '#2a1a1a' },
  { id: 'romance', name: 'Romance', icon: '💕', description: 'Emotional bonds and relationships', color: '#4a1a2a' },
  { id: 'horror', name: 'Horror', icon: '👻', description: 'Fear, suspense, and the unknown', color: '#1a1a1a' },
  { id: 'detective', name: 'Detective', icon: '🔍', description: 'Solve mysteries and catch criminals', color: '#2a2a1a' },
  { id: 'space_scifi', name: 'Space Sci-Fi', icon: '🚀', description: 'Explore the cosmos', color: '#0a1a3a' },
  { id: 'military_war', name: 'Military', icon: '⚔️', description: 'Tactics, duty, and sacrifice', color: '#1a2a1a' },
  { id: 'apocalypse', name: 'Apocalypse', icon: '🌋', description: 'Civilisation has collapsed', color: '#3a2a1a' },
  { id: 'historical', name: 'Historical', icon: '🏰', description: 'Ancient empires and court politics', color: '#2a1a0a' },
  { id: 'survival', name: 'Survival', icon: '🌲', description: 'Endure the wilderness', color: '#0a2a1a' },
  { id: 'superpower', name: 'Superpower', icon: '⚡', description: 'Extraordinary abilities and factions', color: '#2a0a3a' },
  { id: 'isekai', name: 'Isekai', icon: '🌀', description: 'Transported to another world', color: '#1a0a3a' },
  { id: 'vampire', name: 'Vampire', icon: '🧛', description: 'Bloodlines and supernatural society', color: '#2a0a0a' },
  { id: 'slice_of_life', name: 'Slice of Life', icon: '☕', description: 'Quiet moments and real connections', color: '#1a2a2a' },
  { id: 'thriller', name: 'Thriller', icon: '🎯', description: 'Tension, pursuit, and danger', color: '#1a1a2a' },
  { id: 'crime_noir', name: 'Crime Noir', icon: '🕵️', description: 'Dark streets and moral ambiguity', color: '#0a0a1a' },
];

export const RANK_NAMES: Record<string, string[]> = {
  default: ['Bronze I', 'Bronze II', 'Bronze III', 'Silver I', 'Silver II', 'Silver III', 'Gold I', 'Gold II', 'Gold III', 'Platinum I', 'Platinum II', 'Platinum III', 'Diamond', 'Legend', 'Mythic'],
  cultivation: ['Mortal', 'Qi Condensation', 'Foundation Building', 'Core Formation', 'Nascent Soul', 'Spirit Severing', 'Void Refinement', 'Body Integration', 'Mahayana', 'Transcendence', 'Immortal', 'True Immortal', 'Celestial', 'Divine', 'Primordial'],
  zombie: ['Scavenger', 'Survivor', 'Fighter', 'Hunter', 'Warrior', 'Slayer', 'Champion', 'Defender', 'Guardian', 'Vanguard', 'Warlord', 'Overlord', 'Apex', 'Legend', 'Myth'],
  fantasy: ['Novice', 'Apprentice', 'Journeyman', 'Adept', 'Expert', 'Master', 'Grandmaster', 'Sage', 'Archmage', 'Archsage', 'Legend', 'Hero', 'Champion', 'Demigod', 'Transcendent'],
  superpower: ['E-Class', 'D-Class', 'C-Class', 'B-Class', 'A-Class', 'S-Class', 'SS-Class', 'SSS-Class', 'National Level', 'Continental Level', 'World Level', 'Planetary', 'Star Level', 'Galaxy Level', 'Universal'],
};

export const BUBBLE_COLORS = [
  '#1e3a5f', '#2d1b69', '#1a3a1a', '#3a1a1a', '#1a2a3a',
  '#2a1a3a', '#1a3a2a', '#3a2a1a', '#1a1a3a', '#2a3a1a',
  '#3a1a2a', '#1a2a2a', '#2a2a1a', '#1a1a2a', '#2a1a1a',
];

export const CHARACTER_ACCENT_COLORS = [
  '#4f8ef7',
  '#a855f7',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#f97316',
  '#84cc16',
  '#14b8a6',
  '#8b5cf6',
  '#f43f5e',
  '#10b981',
  '#3b82f6',
  '#d946ef',
];

export const PORTRAIT_COLORS = {
  male: ['#1e3a5f', '#1a3a1a', '#2d1b69', '#3a2a1a', '#1a2a3a'],
  female: ['#3a1a2a', '#2a1a3a', '#3a1a1a', '#1a3a2a', '#2a2a1a'],
  unknown: ['#1a1a2a', '#2a2a2a', '#1a2a1a'],
};
