import db from '../database/db';

export async function buildFullGrokContext(novelId: number, timelineId: string): Promise<string> {
  const sections: string[] = [];

  const [
    chapters,
    characters,
    worldStateRow,
    relationships,
    memories,
    progressions,
    skills,
    inventories,
    scenes,
  ] = await Promise.all([
    db.chapters.where('novel_id').equals(novelId).sortBy('chapter_number'),
    db.characters.where('novel_id').equals(novelId).toArray(),
    db.world_state.where('novel_id').equals(novelId).first(),
    db.character_relationships.where('novel_id').equals(novelId).toArray(),
    db.memories.where('novel_id').equals(novelId).toArray(),
    db.progression_data.where('novel_id').equals(novelId).toArray(),
    db.skill_registry.where('novel_id').equals(novelId).toArray(),
    db.inventory.where('novel_id').equals(novelId).toArray(),
    db.scenes.where('novel_id').equals(novelId).reverse().limit(20).toArray(),
  ]);

  // === WORLD STATE ===
  if (worldStateRow?.state_json) {
    try {
      const ws = JSON.parse(worldStateRow.state_json);
      sections.push(`=== WORLD STATE ===\n${JSON.stringify(ws, null, 2)}`);
    } catch {
      sections.push(`=== WORLD STATE ===\n${worldStateRow.state_json}`);
    }
  }

  // === ALL CHARACTERS ===
  if (characters.length > 0) {
    const charLines = characters.map(c => {
      let meta: Record<string, unknown> = {};
      try { meta = JSON.parse(c.metadata_json); } catch {}
      return [
        `Name: ${c.display_name} | Role: ${c.role} | Status: ${c.status} | Gender: ${c.gender}`,
        Object.keys(meta).length > 0 ? `  Metadata: ${JSON.stringify(meta)}` : null,
      ].filter(Boolean).join('\n');
    });
    sections.push(`=== ALL CHARACTERS (${characters.length}) ===\n${charLines.join('\n\n')}`);
  }

  // === ALL RELATIONSHIPS ===
  if (relationships.length > 0) {
    const relLines = relationships.map(r =>
      `${r.character_a_uid} ↔ ${r.character_b_uid}: ${r.relationship_type} (${r.value > 0 ? '+' : ''}${r.value})${r.description ? ' — ' + r.description : ''}`
    );
    sections.push(`=== RELATIONSHIPS ===\n${relLines.join('\n')}`);
  }

  // === PROGRESSION & SKILLS ===
  if (progressions.length > 0) {
    const progLines = progressions.map(p => {
      let stats: Record<string, unknown> = {};
      try { stats = JSON.parse(p.stats_json); } catch {}
      const charName = characters.find(c => c.internal_uid === p.character_uid)?.display_name ?? p.character_uid;
      return `${charName}: Level ${p.level} | Rank: ${p.rank} | Path: ${p.active_path} | Stats: ${JSON.stringify(stats)} | Unspent: ${p.unspent_points}`;
    });
    sections.push(`=== PROGRESSION ===\n${progLines.join('\n')}`);
  }

  if (skills.length > 0) {
    const skillLines = skills.map(s =>
      `[${s.is_active ? 'ACTIVE' : 'inactive'}] ${s.skill_name} (${s.rarity}): ${s.skill_description}`
    );
    sections.push(`=== SKILLS (${skills.length}) ===\n${skillLines.join('\n')}`);
  }

  // === INVENTORY ===
  if (inventories.length > 0) {
    const invLines = inventories.map(inv => {
      const charName = characters.find(c => c.internal_uid === inv.character_uid)?.display_name ?? inv.character_uid;
      let items: unknown[] = [];
      try { items = JSON.parse(inv.items_json); } catch {}
      return `${charName}: ${inv.currency} ${inv.currency_label} | Items: ${JSON.stringify(items)}`;
    });
    sections.push(`=== INVENTORY ===\n${invLines.join('\n')}`);
  }

  // === ALL MEMORIES ===
  if (memories.length > 0) {
    const sorted = [...memories].sort((a, b) => (b.importance_score ?? 0) - (a.importance_score ?? 0));
    const memLines = sorted.map(m =>
      `[importance:${m.importance_score}] ${m.content}`
    );
    sections.push(`=== ALL MEMORIES (${memories.length}) ===\n${memLines.join('\n')}`);
  }

  // === ALL CHAPTER SUMMARIES ===
  if (chapters.length > 0) {
    const chapLines = chapters.map(c =>
      `Ch.${c.chapter_number} "${c.title}": ${c.summary || '(no summary yet)'}`
    );
    sections.push(`=== ALL CHAPTERS (${chapters.length}) ===\n${chapLines.join('\n')}`);
  }

  // === LAST 20 SCENES ===
  if (scenes.length > 0) {
    const sceneTexts = scenes
      .reverse()
      .map((s, i) => `[Scene ${i + 1}]\n${s.raw_output.slice(0, 800)}`);
    sections.push(`=== RECENT SCENES (last ${scenes.length}) ===\n${sceneTexts.join('\n\n---\n\n')}`);
  }

  return sections.join('\n\n');
}
