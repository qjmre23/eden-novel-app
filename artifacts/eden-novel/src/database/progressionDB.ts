import db, { ProgressionData, SkillRegistry, SkillTreeNode } from './db';

export async function getProgression(novelId: number, characterUid: string): Promise<ProgressionData | undefined> {
  return db.progression_data
    .where('novel_id').equals(novelId)
    .and(p => p.character_uid === characterUid)
    .first();
}

export async function createProgression(data: Omit<ProgressionData, 'id'>): Promise<number> {
  return db.progression_data.add(data) as Promise<number>;
}

export async function updateProgression(id: number, data: Partial<ProgressionData>): Promise<void> {
  await db.progression_data.update(id, { ...data, updated_at: Date.now() });
}

export async function getSkills(novelId: number, characterUid: string): Promise<SkillRegistry[]> {
  return db.skill_registry
    .where('novel_id').equals(novelId)
    .and(s => s.character_uid === characterUid)
    .toArray();
}

export async function addSkill(skill: Omit<SkillRegistry, 'id'>): Promise<number> {
  return db.skill_registry.add(skill) as Promise<number>;
}

export async function getSkillTree(novelId: number, characterUid: string): Promise<SkillTreeNode[]> {
  return db.skill_tree_nodes
    .where('novel_id').equals(novelId)
    .and(n => n.character_uid === characterUid)
    .toArray();
}

export async function addSkillTreeNode(node: Omit<SkillTreeNode, 'id'>): Promise<number> {
  return db.skill_tree_nodes.add(node) as Promise<number>;
}

export async function unlockSkillTreeNode(id: number): Promise<void> {
  await db.skill_tree_nodes.update(id, { is_unlocked: true });
}
