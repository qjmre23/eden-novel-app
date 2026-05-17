const envImages = import.meta.glob('/public/environments/**/*.{png,jpg,jpeg,webp}', { eager: false });

function scoreKeyword(filename: string, locationName: string): number {
  const name = locationName.toLowerCase();
  const file = filename.toLowerCase();
  const words = name.split(/[\s_\-/]+/).filter(w => w.length > 2);
  return words.reduce((score, w) => score + (file.includes(w) ? 1 : 0), 0);
}

export async function getEnvironmentImage(genre: string, locationName: string): Promise<string | null> {
  if (!locationName) return null;

  const prefix = `/public/environments/${genre}/`;
  const candidates = Object.keys(envImages).filter(k => k.startsWith(prefix));
  if (candidates.length === 0) return null;

  const scored = candidates.map(k => ({ path: k, score: scoreKeyword(k, locationName) }));
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (best.score === 0) {
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const fallback = candidates[randomIndex];
    try {
      const mod = await (envImages[fallback] as () => Promise<{ default: string }>)();
      return mod.default;
    } catch {
      return null;
    }
  }

  try {
    const mod = await (envImages[best.path] as () => Promise<{ default: string }>)();
    return mod.default;
  } catch {
    return null;
  }
}
