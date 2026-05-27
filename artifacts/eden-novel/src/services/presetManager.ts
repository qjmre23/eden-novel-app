import { modelService } from './modelService';

class PresetManager {
  private presets: Record<string, string> = {};
  private loaded = false;

  async loadAll(): Promise<void> {
    if (this.loaded) return;
    try {
      const modules = import.meta.glob('../presets/**/*.ts', { eager: true }) as Record<string, { default: string }>;
      for (const [path, mod] of Object.entries(modules)) {
        const name = path.split('/').pop()?.replace('.ts', '') || path;
        if (mod.default && typeof mod.default === 'string') {
          this.presets[name] = mod.default;
        }
      }
    } catch (e) {
      console.warn('Preset loading error:', e);
    }
    this.loaded = true;
  }

  stackPresets(names: string[]): string {
    return names
      .map(n => this.presets[n] || `[PRESET: ${n} — content pending]`)
      .join('\n---\n');
  }

  getPreset(name: string): string {
    return this.presets[name] || `[PRESET: ${name} — content pending]`;
  }

  getGenreSystemPrompt(genre: string): string {
    const isGrok = modelService.getProvider() === 'grok';

    const basePresets = [
      'base_narrator',
      `${genre}_genre`,
      'dramatic_tension_engine',     // NEW — tension reading & pacing
      'npc_agenda_engine',           // NEW — NPC behavior matrix
      'messenger_bubble_ui',
      'scene_awareness_engine',
      'world_state_persistence',
      'chapter_system',              // MOVED — after world_state_persistence
      'character_introduction_protocol',
      'character_metadata_expansion',
      'leveling_system',
      'mc_traits_system',
      'story_seed_integration',
      'story_opening_rules',
      'starting_location',
    ];

    // Stack genre-specific opening preset if it exists
    const genreOpeningKey = `${genre}_opening_rules`;
    if (this.presets[genreOpeningKey]) {
      basePresets.push(genreOpeningKey);
    }

    if (isGrok) {
      basePresets.push('grok_content_policy');
    }

    return this.stackPresets(basePresets);
  }

  /** Returns a compact prompt focusing only on dramatic + NPC direction. Used by orchestrationService when emitting per-scene directives. */
  getSceneDirectivePrompt(): string {
    return this.stackPresets([
      'dramatic_tension_engine',
      'npc_agenda_engine',
      'world_state_persistence',
    ]);
  }

  getPilotDecisionPrompt(): string {
    return this.getPreset('pilot_autopilot_decision');
  }

  getAskEdenPrompt(): string {
    return this.stackPresets(['ask_eden_core', 'ask_eden_system_explainer']);
  }

  getChapterGenerationPrompt(): string {
    return this.stackPresets(['chapter_generation', 'chapter_summary']);
  }

  getSkillGenerationPrompt(genre: string): string {
    return this.stackPresets(['ai_skill_generation', `${genre}_progression`, 'leveling_system']);
  }
}

export const presetManager = new PresetManager();
