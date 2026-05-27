import db, { Inventory } from './db';

export interface InventoryItem {
  name: string;
  qty: number;
  description?: string;
  rarity?: string;
}

export async function getInventory(novelId: number, characterUid: string): Promise<Inventory | undefined> {
  return db.inventory
    .where('novel_id').equals(novelId)
    .and(i => i.character_uid === characterUid)
    .first();
}

export async function initInventory(novelId: number, characterUid: string, currencyLabel = 'Gold'): Promise<void> {
  const existing = await getInventory(novelId, characterUid);
  if (existing) return;
  await db.inventory.add({
    novel_id: novelId,
    character_uid: characterUid,
    items_json: '[]',
    currency: 0,
    currency_label: currencyLabel,
    updated_at: Date.now(),
  });
}

export async function addItem(novelId: number, characterUid: string, itemName: string, qty: number): Promise<void> {
  const inv = await getInventory(novelId, characterUid);
  if (!inv || !inv.id) return;
  let items: InventoryItem[] = [];
  try { items = JSON.parse(inv.items_json); } catch {}
  const existing = items.find(i => i.name === itemName);
  if (existing) { existing.qty += qty; }
  else { items.push({ name: itemName, qty }); }
  await db.inventory.update(inv.id, { items_json: JSON.stringify(items), updated_at: Date.now() });
}

export async function removeItem(novelId: number, characterUid: string, itemName: string, qty: number): Promise<void> {
  const inv = await getInventory(novelId, characterUid);
  if (!inv || !inv.id) return;
  let items: InventoryItem[] = [];
  try { items = JSON.parse(inv.items_json); } catch {}
  const idx = items.findIndex(i => i.name === itemName);
  if (idx >= 0) {
    items[idx].qty -= qty;
    if (items[idx].qty <= 0) items.splice(idx, 1);
  }
  await db.inventory.update(inv.id, { items_json: JSON.stringify(items), updated_at: Date.now() });
}
