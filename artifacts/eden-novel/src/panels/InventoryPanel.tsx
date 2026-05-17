import React, { useEffect, useState } from 'react';
import AnimatedPanel from '../components/common/AnimatedPanel';
import { getInventory } from '../database/inventoryDB';
import { parseJsonSafe } from '../core/utils';
import type { Inventory } from '../database/db';
import type { InventoryItem } from '../database/inventoryDB';

interface Props {
  open: boolean;
  onClose: () => void;
  novelId: number;
  mcUid: string;
}

export default function InventoryPanel({ open, onClose, novelId, mcUid }: Props) {
  const [inv, setInv] = useState<Inventory | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (!open) return;
    getInventory(novelId, mcUid).then(data => {
      if (data) {
        setInv(data);
        setItems(parseJsonSafe<InventoryItem[]>(data.items_json, []));
      }
    });
  }, [open, novelId, mcUid]);

  return (
    <AnimatedPanel open={open} onClose={onClose} title="Inventory">
      <div className="px-4 py-4">
        {inv && (
          <div className="flex items-center justify-between mb-4 bg-yellow-900/20 border border-yellow-800/40 rounded-xl px-3 py-2">
            <span className="text-gray-400 text-sm">Currency</span>
            <span className="text-yellow-300 font-bold">{inv.currency} {inv.currency_label}</span>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">🎒</p>
            <p>Inventory is empty</p>
            <p className="text-xs mt-1">Items found during the story appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-3 border border-gray-800">
                <div>
                  <p className="text-white text-sm font-semibold">{item.name}</p>
                  {item.description && <p className="text-gray-500 text-xs">{item.description}</p>}
                </div>
                <span className="text-gray-300 font-bold text-sm">×{item.qty}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AnimatedPanel>
  );
}
