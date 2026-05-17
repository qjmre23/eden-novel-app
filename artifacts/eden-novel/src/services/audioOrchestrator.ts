import { audioService } from './audioService';

interface SceneContext {
  genre: string;
  tensionLevel?: string;
  locationName?: string;
  hasCombat?: boolean;
  isLevelUp?: boolean;
}

function ambientForGenre(genre: string, tensionLevel = 'low'): string | null {
  // Use genre name directly as the file slug so filenames match the README convention:
  // public/audio/ambient/<genre>_low.mp3 | <genre>_high.mp3
  const base = '/audio/ambient';
  const suffix = tensionLevel === 'high' ? 'high' : 'low';
  return `${base}/${genre}_${suffix}.mp3`;
}

function musicForContext(ctx: SceneContext): string | null {
  const base = '/audio/music';
  if (ctx.hasCombat) return `${base}/${ctx.genre}_combat.mp3`;
  if (ctx.tensionLevel === 'high') return `${base}/${ctx.genre}_tension.mp3`;
  if (ctx.tensionLevel === 'medium') return `${base}/${ctx.genre}_tension.mp3`;
  return `${base}/${ctx.genre}_calm.mp3`;
}

export function orchestrateScene(ctx: SceneContext): void {
  const ambient = ambientForGenre(ctx.genre, ctx.tensionLevel);
  if (ambient) audioService.playAmbient(ambient).catch(() => {});

  const music = musicForContext(ctx);
  if (music) audioService.playMusic(music).catch(() => {});

  if (ctx.hasCombat) audioService.playSfx('/audio/sfx/combat_start.mp3');
  if (ctx.isLevelUp) audioService.playSfx('/audio/sfx/level_up.mp3');
}
