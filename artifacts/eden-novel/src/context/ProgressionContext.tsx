import React, { createContext, useContext, useState, useCallback } from 'react';
import { getProgression } from '../database/progressionDB';
import { getSkills } from '../database/progressionDB';
import type { ProgressionData, SkillRegistry } from '../database/db';

interface ProgressionContextValue {
  progression: ProgressionData | null;
  skills: SkillRegistry[];
  reload: (novelId: number, mcUid: string) => Promise<void>;
}

const ProgressionContext = createContext<ProgressionContextValue | null>(null);

export function ProgressionProvider({ children }: { children: React.ReactNode }) {
  const [progression, setProgression] = useState<ProgressionData | null>(null);
  const [skills, setSkills] = useState<SkillRegistry[]>([]);

  const reload = useCallback(async (novelId: number, mcUid: string) => {
    const prog = await getProgression(novelId, mcUid);
    setProgression(prog ?? null);
    const sk = await getSkills(novelId, mcUid);
    setSkills(sk);
  }, []);

  return (
    <ProgressionContext.Provider value={{ progression, skills, reload }}>
      {children}
    </ProgressionContext.Provider>
  );
}

export function useProgression() {
  const ctx = useContext(ProgressionContext);
  if (!ctx) throw new Error('useProgression must be used within ProgressionProvider');
  return ctx;
}
