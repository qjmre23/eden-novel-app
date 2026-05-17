import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPanel from '../components/common/AnimatedPanel';
import CharacterAvatar from '../components/chat/CharacterAvatar';
import { getCharactersByNovel, getRelationships } from '../database/characterDB';
import { parseJsonSafe } from '../core/utils';
import type { Character, CharacterRelationship } from '../database/db';
import { useStory } from '../context/StoryContext';
import { MapPin, BookOpen, Heart, Skull, UserCheck, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  novelId: number;
}

const GENRE_EXTRA_FIELDS: Record<string, string[]> = {
  school: ['year', 'course', 'section', 'club', 'gpa'],
  cultivation: ['realm', 'sect', 'cultivation_path', 'spirit_root'],
  fantasy: ['class', 'guild', 'magic_affinity', 'title'],
  cyberpunk: ['corp_affiliation', 'implants', 'hack_rating', 'reputation'],
  mafia: ['rank', 'territory', 'loyalty_score', 'specialization'],
  military_war: ['rank', 'unit', 'specialization', 'medals'],
  detective: ['badge_number', 'agency', 'case_clearance_rate', 'specialty'],
  vampire: ['bloodline', 'age', 'clan', 'sire'],
  space_scifi: ['rank', 'ship', 'species', 'specialization'],
  historical: ['noble_rank', 'faction', 'title', 'era'],
  superpower: ['ability_class', 'threat_level', 'hero_name', 'affiliation'],
  isekai: ['class', 'job', 'level', 'party_role'],
};

function RelationshipBar({ value }: { value: number }) {
  const pct = Math.min(100, ((value + 100) / 200) * 100);
  const color = value >= 60 ? '#4ade80' : value >= 0 ? '#60a5fa' : value >= -40 ? '#f59e0b' : '#f87171';
  const label = value >= 80 ? 'Close Ally' : value >= 40 ? 'Friend' : value >= 0 ? 'Neutral' : value >= -40 ? 'Tense' : 'Enemy';
  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">Relationship</span>
        <span className="text-xs font-semibold" style={{ color }}>{label} ({value > 0 ? '+' : ''}{value})</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

export default function CharacterPanel({ open, onClose, novelId }: Props) {
  const { state } = useStory();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'alive' | 'dead'>('alive');

  useEffect(() => {
    if (!open) return;
    getCharactersByNovel(novelId).then(chars => {
      const sorted = [...chars].sort((a, b) => {
        if (a.role === 'protagonist') return -1;
        if (b.role === 'protagonist') return 1;
        if (a.status === 'alive' && b.status !== 'alive') return -1;
        if (a.status !== 'alive' && b.status === 'alive') return 1;
        return a.first_appeared_chapter - b.first_appeared_chapter;
      });
      setCharacters(sorted);
    });
    getRelationships(novelId).then(setRelationships);
  }, [open, novelId]);

  const getRelValue = (uid: string) => {
    const rel = relationships.find(r => r.character_a_uid === uid || r.character_b_uid === uid);
    return rel?.value ?? 0;
  };

  const extraFields = GENRE_EXTRA_FIELDS[state.genre] ?? [];

  const displayChars = characters.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'alive') return c.status === 'alive';
    return c.status !== 'alive';
  });

  const aliveCount = characters.filter(c => c.status === 'alive').length;
  const deadCount = characters.filter(c => c.status !== 'alive').length;

  return (
    <AnimatedPanel open={open} onClose={onClose} title="Characters">
      {/* Filter tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-2">
        {([['all', `All (${characters.length})`], ['alive', `Alive (${aliveCount})`], ['dead', `Dead (${deadCount})`]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${filter === key ? 'bg-gray-800 text-white' : 'text-gray-600 hover:text-gray-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 py-2 space-y-2">
        {displayChars.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">
              {filter === 'dead' ? 'No casualties yet' : 'No characters yet. Start your story!'}
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {displayChars.map(char => {
            const meta = parseJsonSafe<Record<string, unknown>>(char.metadata_json, {});
            const isExpanded = expanded === char.id;
            const relVal = getRelValue(char.internal_uid);
            const isDead = char.status !== 'alive';
            const isProtagonist = char.role === 'protagonist';
            const isIntroduced = char.has_introduced_self || isProtagonist;

            return (
              <motion.div
                key={char.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`rounded-xl border overflow-hidden transition-colors ${isDead ? 'border-red-900/40 bg-red-950/10' : 'border-gray-800 bg-gray-900/60'}`}
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : (char.id ?? null))}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <div className="relative">
                    <CharacterAvatar name={char.display_name} color={char.bubble_color} />
                    {isDead && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-900 rounded-full flex items-center justify-center">
                        <Skull size={9} className="text-red-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-semibold text-sm truncate ${isDead ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {char.display_name}
                      </p>
                      {!isIntroduced && !isProtagonist && (
                        <span className="text-xs bg-yellow-900/30 text-yellow-600 px-1.5 py-0.5 rounded-full">not introduced</span>
                      )}
                      {isProtagonist && (
                        <span className="text-xs bg-indigo-900/40 text-indigo-400 px-1.5 py-0.5 rounded-full">MC</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-gray-500 text-xs capitalize">{char.role}</p>
                      {char.current_location && (
                        <>
                          <span className="text-gray-700">·</span>
                          <div className="flex items-center gap-1 text-gray-600 text-xs">
                            <MapPin size={9} />
                            <span className="truncate max-w-24">{char.current_location}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={14} className="text-gray-600 shrink-0" /> : <ChevronDown size={14} className="text-gray-600 shrink-0" />}
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-gray-800/60 pt-3 space-y-2">
                        {/* Standard fields */}
                        <Row label="Gender" value={char.gender || '—'} />
                        <Row label="Status" value={char.status} valueClass={isDead ? 'text-red-400' : 'text-green-400'} />
                        <Row label="First appeared" value={`Chapter ${char.first_appeared_chapter}`} />
                        {char.current_location && <Row label="Location" value={char.current_location} icon={<MapPin size={10} />} />}
                        <Row label="Introduced" value={isIntroduced ? 'Yes' : 'Not yet'} valueClass={isIntroduced ? 'text-green-400' : 'text-yellow-500'} icon={<UserCheck size={10} />} />

                        {/* Genre-specific fields from metadata */}
                        {extraFields.map(field => {
                          const val = meta[field];
                          if (!val) return null;
                          return <Row key={field} label={field.replace(/_/g, ' ')} value={String(val)} />;
                        })}

                        {/* Remaining metadata fields */}
                        {Object.entries(meta)
                          .filter(([k]) => !extraFields.includes(k) && k !== 'world')
                          .map(([k, v]) => (
                            <Row key={k} label={k.replace(/_/g, ' ')} value={String(v)} />
                          ))}

                        {/* Relationship bar (for non-protagonist) */}
                        {!isProtagonist && <RelationshipBar value={relVal} />}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </AnimatedPanel>
  );
}

function Row({ label, value, valueClass, icon }: { label: string; value: string; valueClass?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start">
      <span className="text-gray-600 text-xs capitalize w-28 shrink-0 flex items-center gap-1">
        {icon}{label}
      </span>
      <span className={`text-xs flex-1 ${valueClass ?? 'text-gray-300'}`}>{value}</span>
    </div>
  );
}
