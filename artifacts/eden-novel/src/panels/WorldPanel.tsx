import React, { useEffect, useState } from 'react';
import AnimatedPanel from '../components/common/AnimatedPanel';
import { loadWorldState } from '../services/worldStateService';
import type { WorldStateData } from '../services/worldStateService';

interface Props {
  open: boolean;
  onClose: () => void;
  novelId: number;
}

export default function WorldPanel({ open, onClose, novelId }: Props) {
  const [ws, setWs] = useState<WorldStateData | null>(null);

  useEffect(() => {
    if (open) loadWorldState(novelId).then(setWs);
  }, [open, novelId]);

  return (
    <AnimatedPanel open={open} onClose={onClose} title="World State">
      <div className="px-4 py-4 space-y-4">
        {!ws ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : (
          <>
            <Section title="Current Situation">
              <Row label="Location" value={ws.current_location} />
              <Row label="Arc" value={ws.current_arc} />
              <Row label="Chapter" value={String(ws.current_chapter)} />
              <Row label="Time" value={`${ws.time_of_day}, Day ${ws.day_number}`} />
              <Row label="Weather" value={ws.weather} />
              <Row label="Pacing" value={ws.narrative_pacing} />
              <Row label="Mood" value={ws.emotional_state} />
            </Section>

            {ws.established_locations.length > 0 && (
              <Section title="Known Locations">
                {ws.established_locations.map((loc, i) => (
                  <div key={i} className="text-gray-300 text-xs py-0.5">• {loc}</div>
                ))}
              </Section>
            )}

            {ws.active_factions.length > 0 && (
              <Section title="Factions">
                {ws.active_factions.map((f, i) => (
                  <div key={i} className="text-gray-300 text-xs py-0.5">• {f}</div>
                ))}
              </Section>
            )}

            {ws.world_events.length > 0 && (
              <Section title="Recent World Events">
                {ws.world_events.slice(-5).reverse().map((e, i) => (
                  <div key={i} className="text-gray-300 text-xs py-0.5">• {e}</div>
                ))}
              </Section>
            )}

            <Section title="Enabled Systems">
              <div className="flex flex-wrap gap-1.5">
                {ws.enabled_systems.map(sys => (
                  <span key={sys} className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800/50">{sys}</span>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </AnimatedPanel>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{title}</p>
      <div className="bg-gray-900/60 rounded-xl px-3 py-2 space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 py-0.5">
      <span className="text-gray-500 text-xs w-24 shrink-0 capitalize">{label}</span>
      <span className="text-gray-200 text-xs">{value}</span>
    </div>
  );
}
