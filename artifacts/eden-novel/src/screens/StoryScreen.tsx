import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Play, Pause, Users, BarChart2, Globe, BookOpen, Package, Volume2, VolumeX } from 'lucide-react';
import { useModel } from '../context/ModelContext';
import { novaSonicService } from '../services/novaSonicService';
import MessageBubble from '../components/chat/MessageBubble';
import NarratorBubble from '../components/chat/NarratorBubble';
import EnvironmentBubble from '../components/chat/EnvironmentBubble';
import TypingIndicator from '../components/chat/TypingIndicator';
import MinigameWrapper from '../components/minigames/MinigameWrapper';
import { shouldTriggerMinigame } from '../services/minigameService';
import type { MinigameResult } from '../services/minigameService';
import { predictiveEngine } from '../services/predictiveEngine';
import { getEnvironmentImage } from '../services/environmentImageService';
import ChoiceButton from '../components/choice/ChoiceButton';
import CustomActionInput from '../components/choice/CustomActionInput';
import CharacterPanel from '../panels/CharacterPanel';
import StatusPanel from '../panels/StatusPanel';
import WorldPanel from '../panels/WorldPanel';
import AskEdenPanel from '../panels/AskEdenPanel';
import InventoryPanel from '../panels/InventoryPanel';
import LevelUpOverlay from '../overlays/LevelUpOverlay';
import SkillTreeOverlay from '../overlays/SkillTreeOverlay';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { useStory, type Bubble } from '../context/StoryContext';
import { useProgression } from '../context/ProgressionContext';
import { useAppSettings } from '../context/AppContext';
import { loadNovel, incrementActionCount, resetActionCount } from '../services/novelService';
import { generateNextScene, generateNovelOpening, isMCSpeaker, applyParsedEffects } from '../services/orchestrationService';
import { orchestrateScene } from '../services/audioOrchestrator';
import { assignVoice } from '../services/voiceAssignmentService';
import { closeChapterAndBeginNext } from '../services/chapterService';
import { getProgression, updateProgression } from '../database/progressionDB';
import { addItem, removeItem } from '../database/inventoryDB';
import { updateRelationship, applyRelationshipDelta } from '../database/characterDB';
import { makePilotDecision, generatePilotRoleplayAction, PILOT_PAUSE_REASONS } from '../services/pilotService';
import { parseNarrativeTags, parseBubbles } from '../parsers/tagParser';
import { getCharactersByNovel } from '../database/characterDB';
import { addScene, getScenesByNovel, countScenesInChapter } from '../database/sceneDB';
import { getLastChapter } from '../database/chapterDB';
import { loadWorldState } from '../services/worldStateService';
import { presetManager } from '../services/presetManager';
import { generateId } from '../core/utils';
import { companionNarratorService } from '../services/companionNarratorService';
import type { Novel } from '../database/db';

type Panel = 'characters' | 'status' | 'world' | 'eden' | 'inventory' | null;

interface ChoiceMapEntry {
  label: string;
  roleplayText?: string;
}

interface ChapterTransitionCardProps {
  data: NonNullable<Bubble['chapterTransitionData']>;
  onAskEden: () => void;
  onNext: () => void;
  onPrevChapter?: () => void;
}

function ChapterTransitionCard({ data, onAskEden, onNext, onPrevChapter }: ChapterTransitionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-3 my-4 rounded-2xl overflow-hidden border border-yellow-600/30 bg-gradient-to-b from-yellow-950/40 to-gray-900/80"
    >
      <div className="px-5 py-5 text-center">
        <p className="text-yellow-500/70 text-xs uppercase tracking-widest font-semibold mb-1">
          Chapter {data.completedChapter} Complete
        </p>
        <h3 className="text-white font-bold text-lg leading-snug">{data.title}</h3>
        <div className="mt-4 flex gap-2 justify-center flex-wrap">
          {data.completedChapter > 1 && onPrevChapter && (
            <button
              onClick={onPrevChapter}
              className="px-4 py-1.5 rounded-full text-xs font-semibold border border-gray-600/50 text-gray-400 bg-gray-800/40 hover:bg-gray-700/50 transition-colors"
            >
              ← Ch. {data.completedChapter - 1}
            </button>
          )}
          <button
            onClick={onAskEden}
            className="px-4 py-1.5 rounded-full text-xs font-semibold border border-purple-600/50 text-purple-300 bg-purple-900/30 hover:bg-purple-800/40 transition-colors"
          >
            Ask Eden
          </button>
          <button
            onClick={onNext}
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-yellow-600/30 border border-yellow-600/50 text-yellow-200 hover:bg-yellow-600/50 transition-colors"
          >
            Chapter {data.newChapter} →
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function StoryScreen() {
  const params = useParams<{ novelId: string }>();
  const [, navigate] = useLocation();
  const novelId = parseInt(params.novelId ?? '0');
  const { state, dispatch } = useStory();
  const { reload: reloadProgression, skills: progressionSkills } = useProgression();
  const { settings } = useAppSettings();

  const { provider } = useModel();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [ttsPaused, setTtsPaused] = useState(false);
  const [narratorPlaying, setNarratorPlaying] = useState(() => companionNarratorService.isPlaying());
  const [activeMinigame, setActiveMinigame] = useState<import('../services/minigameService').MinigameType | null>(null);
  const lastEnvLocationRef = useRef<string>('');

  // Sync narrator play/pause state from service
  useEffect(() => {
    const sync = () => setNarratorPlaying(companionNarratorService.isPlaying());
    companionNarratorService.addListener(sync);
    return () => companionNarratorService.removeListener(sync);
  }, []);

  // Off-topic counter for story drift detection
  const offTopicRef = useRef(0);

  // Persisted choice roleplay map per novel
  const choiceMapRef = useRef<Record<string, ChoiceMapEntry>>({});
  const CHOICE_MAP_KEY = `eden_choices_${novelId}`;

  const BUBBLES_KEY = `eden_bubbles_${novelId}`;
  const saveBubblesToStorage = useCallback((bubbles: Bubble[]) => {
    try {
      localStorage.setItem(BUBBLES_KEY, JSON.stringify(bubbles.slice(-150)));
    } catch {}
  }, [BUBBLES_KEY]);

  // Persist a scene (AI output + parsed bubbles) to IndexedDB
  const saveSceneToDB = useCallback(async (rawText: string, bubblesToSave: Bubble[], interactionMode: string) => {
    try {
      const lastChapter = await getLastChapter(novelId, state.timelineId);
      const chapterId = lastChapter?.id ?? 0;
      const sceneCount = chapterId ? await countScenesInChapter(chapterId) : 0;
      await addScene({
        chapter_id: chapterId,
        novel_id: novelId,
        timeline_id: state.timelineId,
        scene_number: sceneCount + 1,
        raw_output: rawText,
        parsed_bubbles_json: JSON.stringify(bubblesToSave),
        interaction_mode: interactionMode,
        metadata_json: JSON.stringify({ action_count: state.actionCount, chapter: state.currentChapter }),
        created_at: Date.now(),
      });
    } catch {}
  }, [novelId, state.timelineId, state.actionCount, state.currentChapter]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pilotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  useEffect(() => {
    bubblesRef.current = state.bubbles;
  }, [state.bubbles]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
  }, []);

  // Load choice map on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHOICE_MAP_KEY);
      if (saved) choiceMapRef.current = JSON.parse(saved);
    } catch {}
  }, [CHOICE_MAP_KEY]);

  const saveChoiceMap = useCallback(() => {
    try {
      localStorage.setItem(CHOICE_MAP_KEY, JSON.stringify(choiceMapRef.current));
    } catch {}
  }, [CHOICE_MAP_KEY]);

  useEffect(() => {
    if (!novelId) return;
    setLoadingMsg('Loading story…');
    loadNovel(novelId).then(async n => {
      if (!n) { navigate('/novels'); return; }
      setNovel(n);
      await presetManager.loadAll();
      const ws = await loadWorldState(novelId);
      const chars = await getCharactersByNovel(novelId);
      const mc = chars.find(c => c.role === 'protagonist');
      dispatch({
        type: 'SET_NOVEL',
        novelId,
        mcUid: mc?.internal_uid ?? '',
        genre: n.genre,
        timelineId: n.active_timeline_id,
      });
      // Seed action count AFTER SET_NOVEL so it doesn't get reset to 0 by that reducer case
      dispatch({ type: 'SET_ACTION_COUNT', n: n.action_count ?? 0 });

      // Load saved scenes from IndexedDB (primary source of truth)
      try {
        const dbScenes = await getScenesByNovel(novelId);
        if (dbScenes.length > 0) {
          const loadedBubbles: Bubble[] = [];
          for (const scene of dbScenes) {
            try {
              const parsed = JSON.parse(scene.parsed_bubbles_json) as Bubble[];
              if (Array.isArray(parsed)) loadedBubbles.push(...parsed);
            } catch {}
          }
          if (loadedBubbles.length > 0) {
            dispatch({ type: 'LOAD_BUBBLES', bubbles: loadedBubbles });
            dispatch({ type: 'SET_INTERACTION', mode: 'roleplay' });
          }
        }
      } catch {}

      // Fallback to localStorage for backwards compatibility
      if (bubblesRef.current.length === 0) {
        try {
          const saved = localStorage.getItem(`eden_bubbles_${novelId}`);
          if (saved) {
            const parsed = JSON.parse(saved) as Bubble[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              dispatch({ type: 'LOAD_BUBBLES', bubbles: parsed });
              dispatch({ type: 'SET_INTERACTION', mode: 'roleplay' });
            }
          }
        } catch {}
      }

      dispatch({ type: 'SET_CHAPTER', n: (ws as any).current_chapter ?? 1 });
      dispatch({ type: 'SET_LOCATION', loc: (ws as any).current_location ?? '' });
      dispatch({ type: 'SET_ARC', arc: (ws as any).current_arc ?? '' });
      if (mc) await reloadProgression(novelId, mc.internal_uid);
      setLoadingMsg('');
      setInitialized(true);
      // Restore last choices from localStorage if bubbles are already loaded
      try {
        const savedChoices = localStorage.getItem(`eden_last_choices_${novelId}`);
        if (savedChoices) {
          const restoredChoices = JSON.parse(savedChoices) as { choices: string[]; mode: string };
          if (restoredChoices.choices?.length > 0) {
            dispatch({ type: 'SET_INTERACTION', mode: restoredChoices.mode as any, choices: restoredChoices.choices });
          }
        }
      } catch {}
    });
  }, [novelId]);

  useEffect(() => {
    if (initialized && state.bubbles.length === 0 && novel) {
      handleOpeningScene();
    }
  }, [initialized]);

  useEffect(() => {
    scrollToBottom();
  }, [state.bubbles, state.streamingText]);

  // Clear TTS dedupe when novel changes
  useEffect(() => {
    setTtsPaused(false);
    novaSonicService.clearDedupe();
    companionNarratorService.clearDedupe();
  }, [novelId]);

  // Nova TTS: speak each new finished bubble with persistent voice assignment
  useEffect(() => {
    if (provider !== 'nova') return;
    if (!state.bubbles.length) return;
    const latest = state.bubbles[state.bubbles.length - 1];
    if (latest.isStreaming || (latest as any).isTyping) return;
    const text = latest.content?.trim();
    if (!text) return;
    const isNarr = !!latest.isNarrator;
    // Respect per-type voice toggles from Settings
    if (isNarr && localStorage.getItem('eden_narrator_voice_enabled') === 'false') return;
    if (!isNarr && localStorage.getItem('eden_char_voices_enabled') === 'false') return;
    (async () => {
      const voice = latest.speaker
        ? await assignVoice(novelId, latest.speaker, isNarr)
        : undefined;
      novaSonicService.speakBubble(latest.id, text, latest.speaker, isNarr, voice);
    })();
  }, [state.bubbles, provider, novelId]);

  const addBubble = useCallback((bubble: Omit<Bubble, 'id' | 'timestamp'>) => {
    const b: Bubble = { ...bubble, id: generateId(), timestamp: Date.now() };
    dispatch({ type: 'ADD_BUBBLE', bubble: b });
    companionNarratorService.enqueueBubble(b);
  }, [dispatch]);

  const handleOpeningScene = async () => {
    if (!novel) return;
    dispatch({ type: 'SET_GENERATING', val: true });
    dispatch({ type: 'SET_INTERACTION', mode: 'passive' });

    let fullText = '';

    addBubble({ content: '', isNarrator: true, isStreaming: true });

    await generateNovelOpening(novelId, novel.genre, novel.mc_name, novel.world_name, novel.story_seed, {
      onToken: (t) => {
        fullText += t;
        dispatch({ type: 'UPDATE_STREAMING', text: fullText });
      },
      onError: (e) => dispatch({ type: 'SET_ERROR', err: e }),
    }, novel.mc_traits_json, novel.starting_location, novel.starting_skills_json);

    dispatch({ type: 'CLEAR_BUBBLES' });
    const openingMode = await processParsedOutput(fullText, novel.genre, novel.mc_name);

    // Persist opening scene to IndexedDB
    await saveSceneToDB(fullText, bubblesRef.current, openingMode);

    dispatch({ type: 'SET_GENERATING', val: false });
    if (openingMode === 'none' || openingMode === 'roleplay') {
      dispatch({ type: 'SET_INTERACTION', mode: 'roleplay' });
    }
  };

  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  const renderBubblesSequentially = useCallback(async (
    rawBubbles: Array<{ speaker?: string; content: string; isNarrator?: boolean }>,
    chars: Array<{ display_name: string; bubble_color: string }>,
    mcName: string,
  ) => {
    for (const b of rawBubbles) {
      if (b.isNarrator) {
        dispatch({ type: 'SET_TYPING' });
        await sleep(600 + Math.random() * 1200);
        dispatch({ type: 'CLEAR_TYPING' });
        addBubble({ content: b.content, isNarrator: true });
      } else if (b.speaker && isMCSpeaker(b.speaker, mcName)) {
        continue;
      } else {
        const char = chars.find(c => c.display_name === b.speaker);
        dispatch({ type: 'SET_TYPING' });
        await sleep(600 + Math.random() * 1200);
        dispatch({ type: 'CLEAR_TYPING' });
        addBubble({ content: b.content, speaker: b.speaker, bubbleColor: char?.bubble_color });
      }
      await sleep(settings.bubbleDelay);
      scrollToBottom();
    }
  }, [dispatch, addBubble, settings.bubbleDelay, scrollToBottom]);

  const processParsedOutput = async (rawText: string, genre: string, mcName: string): Promise<'decision' | 'cinematic' | 'roleplay' | 'none'> => {
    const parsed = parseNarrativeTags(rawText);
    const rawBubbles = parseBubbles(parsed.cleanText);
    const chars = await getCharactersByNovel(novelId);

    await renderBubblesSequentially(rawBubbles, chars, mcName);

    if (parsed.timeSkip) {
      addBubble({ content: parsed.timeSkip, isNarrator: true });
    }

    if (parsed.locationChange) {
      dispatch({ type: 'SET_LOCATION', loc: parsed.locationChange });
      // Environment bubbles are dispatched here (in processParsedOutput) rather than in
      // audioOrchestrator so they can be sequenced alongside other narrative bubbles and
      // de-duplicated against lastEnvLocationRef before the image fetch completes.
      if (parsed.locationChange !== lastEnvLocationRef.current && localStorage.getItem('eden_env_images_enabled') !== 'false') {
        lastEnvLocationRef.current = parsed.locationChange;
        const locName = parsed.locationChange;
        getEnvironmentImage(genre, locName).then(imgUrl => {
          addBubble({ content: locName, isEnvironment: true, environmentImageUrl: imgUrl });
        }).catch(() => {});
      }
    }
    for (const su of parsed.skillUnlocks) dispatch({ type: 'ADD_SKILL_UNLOCK', skill: su });

    // Store choice roleplay text mapping
    if (parsed.choiceOptions.length > 0) {
      for (const opt of parsed.choiceOptions) {
        if (opt.roleplayText) {
          choiceMapRef.current[opt.label] = { label: opt.label, roleplayText: opt.roleplayText };
        }
      }
      saveChoiceMap();
    }

    const LAST_CHOICES_KEY = `eden_last_choices_${novelId}`;

    if (parsed.interactionMode) {
      dispatch({ type: 'SET_INTERACTION', mode: parsed.interactionMode as any, choices: parsed.choices });
      if (parsed.choices.length > 0) {
        try { localStorage.setItem(LAST_CHOICES_KEY, JSON.stringify({ choices: parsed.choices, mode: parsed.interactionMode })); } catch {}
      }
      return parsed.interactionMode as any;
    }

    if (parsed.choices.length > 0) {
      dispatch({ type: 'SET_INTERACTION', mode: 'decision', choices: parsed.choices });
      try { localStorage.setItem(LAST_CHOICES_KEY, JSON.stringify({ choices: parsed.choices, mode: 'decision' })); } catch {}
      if (state.novelId && state.mcUid) {
        predictiveEngine.preGenerate(state.novelId, state.timelineId, state.mcUid, mcName, genre, parsed.choices, 600, 0.7).catch(() => {});
      }
      return 'decision';
    }

    dispatch({ type: 'SET_INTERACTION', mode: 'roleplay' });
    return 'roleplay';
  };

  const handleAction = useCallback(async (action: string) => {
    if (state.isGenerating || !state.novelId || !novel) return;
    dispatch({ type: 'SET_GENERATING', val: true });
    dispatch({ type: 'SET_INTERACTION', mode: 'passive' });
    try { localStorage.removeItem(`eden_last_choices_${novelId}`); } catch {}

    // Check if this action came from a choice button with roleplay text
    const mappedChoice = choiceMapRef.current[action];
    const displayAction = mappedChoice?.roleplayText || action;

    if (state.interactionMode !== 'cinematic') {
      addBubble({ content: displayAction, isUser: true, speaker: novel.mc_name });
    }

    // Story drift detection: if this is a custom text (not a mapped choice), check if off-topic
    let isCustomAction = !mappedChoice && !action.startsWith('[');
    if (isCustomAction && action.length < 5) {
      // Very short/nonsense input counts as off-topic
      offTopicRef.current += 1;
    } else {
      offTopicRef.current = Math.max(0, offTopicRef.current - 1);
    }

    let fullText = '';
    const prevChoices = state.choices; // capture previous choices before async call

    // Fast path: serve pre-generated scene from cache if available.
    // applyParsedEffects is called so tag-driven mutations (level-up, memory, inventory,
    // character creation, world-state) are identical to the normal generation path.
    const cached = predictiveEngine.consume(action);
    if (cached) {
      fullText = cached;
      dispatch({ type: 'UPDATE_STREAMING', text: fullText });
      await applyParsedEffects(
        novelId,
        state.timelineId,
        state.mcUid,
        novel.mc_name,
        state.genre,
        fullText,
        {
          onToken: () => {},
          onTagsParsed: () => {},
          onLevelUp: (result) => {
            dispatch({ type: 'SET_LEVEL_UP', result });
            reloadProgression(novelId, state.mcUid);
          },
          onChapterEnd: async () => {
            dispatch({ type: 'SET_CHAPTER', n: state.currentChapter + 1 });
            dispatch({ type: 'SET_ACTION_COUNT', n: 0 });
            await resetActionCount(novelId);
          },
          onPilotPause: (reason) => dispatch({ type: 'PILOT_PAUSE', reason }),
          onNewCharacter: () => {},
          onSkillUnlock: (skill) => dispatch({ type: 'ADD_SKILL_UNLOCK', skill }),
          onError: (e) => dispatch({ type: 'SET_ERROR', err: e }),
        }
      );
    } else {
    await generateNextScene(
      novelId,
      state.timelineId,
      state.mcUid,
      novel.mc_name,
      state.genre,
      action,
      {
        onToken: (t) => { fullText += t; dispatch({ type: 'UPDATE_STREAMING', text: fullText }); },
        onTagsParsed: () => {},
        onLevelUp: (result) => {
          dispatch({ type: 'SET_LEVEL_UP', result });
          reloadProgression(novelId, state.mcUid);
        },
        onChapterEnd: async () => {
          dispatch({ type: 'SET_CHAPTER', n: state.currentChapter + 1 });
          dispatch({ type: 'SET_ACTION_COUNT', n: 0 });
          await resetActionCount(novelId);
        },
        onPilotPause: (reason) => dispatch({ type: 'PILOT_PAUSE', reason }),
        onNewCharacter: () => {},
        onSkillUnlock: (skill) => dispatch({ type: 'ADD_SKILL_UNLOCK', skill }),
        onError: (e) => dispatch({ type: 'SET_ERROR', err: e }),
      },
      600,
      0.7,
      offTopicRef.current,
      prevChoices
    );
    } // end else (no predictive cache)

    dispatch({ type: 'FINISH_STREAMING' });
    const mode = await processParsedOutput(fullText, state.genre, novel.mc_name);

    // Trigger adaptive audio based on the scene content
    const hasCombat = /\b(attack|battle|fight|combat|sword|slash|dodge|parry|kill)\b/i.test(fullText);
    const isLevelUp = /\b(level up|leveled up|rank up|breakthrough|advanced to)\b/i.test(fullText);
    orchestrateScene({
      genre: state.genre,
      locationName: state.currentLocation,
      tensionLevel: state.actionCount > 15 ? 'high' : state.actionCount > 8 ? 'medium' : 'low',
      hasCombat,
      isLevelUp,
    });

    // Persist scene to IndexedDB (source of truth)
    await saveSceneToDB(fullText, bubblesRef.current, mode);

    // Increment action count
    const newCount = await incrementActionCount(novelId);
    dispatch({ type: 'INCREMENT_ACTION' });

    // Check if a minigame should trigger
    const mgType = shouldTriggerMinigame(state.genre, fullText, newCount);
    if (mgType) setActiveMinigame(mgType);

    if (newCount >= settings.autoChapterEvery) {
      try {
        const completedChapter = state.currentChapter;
        const { newChapterId, title: closedTitle } = await closeChapterAndBeginNext(novelId, state.timelineId);
        const nextChapter = completedChapter + 1;
        dispatch({ type: 'SET_CHAPTER', n: nextChapter });
        dispatch({ type: 'RESET_ACTION_COUNT' });
        await resetActionCount(novelId);
        addBubble({
          content: '',
          isChapterTransition: true,
          chapterTransitionData: {
            completedChapter,
            newChapter: nextChapter,
            newChapterId,
            title: closedTitle,
          },
        });
        // Gate all interaction until user explicitly presses Next Chapter
        dispatch({ type: 'SET_INTERACTION', mode: 'passive' });
        await saveSceneToDB('', bubblesRef.current, 'roleplay');
      } catch {}
    }

    dispatch({ type: 'SET_GENERATING', val: false });

    // Persist bubbles to both IndexedDB scenes and localStorage fallback
    setTimeout(() => saveBubblesToStorage(bubblesRef.current), 300);

    const pilotDelayMs = { sensitive: 1500, normal: 3000, relaxed: 5000 }[settings.pilotSensitivity] ?? 3000;
    if (state.pilotMode && !state.pilotPaused) {
      if (mode === 'decision' || mode === 'roleplay' || mode === 'none') {
        pilotTimerRef.current = setTimeout(() => runPilotDecision(), pilotDelayMs);
      }
    }
  }, [state, settings, novelId, novel]);

  const handleNextChapterStart = useCallback((transitionBubbleId: string) => {
    dispatch({ type: 'REMOVE_BUBBLE', id: transitionBubbleId });
    handleAction('[chapter_start]');
  }, [dispatch, handleAction]);

  const pilotDelayMs = { sensitive: 1500, normal: 3000, relaxed: 5000 }[settings.pilotSensitivity] ?? 3000;

  const runPilotDecision = useCallback(async () => {
    if (!state.pilotMode || state.pilotPaused || state.isGenerating) return;

    if (state.interactionMode === 'passive' || state.choices.length === 0) {
      const action = generatePilotRoleplayAction(state.genre);
      handleAction(action);
      return;
    }

    const ws = await loadWorldState(novelId);
    const idx = await makePilotDecision(state.choices, {
      genre: state.genre,
      currentArc: state.currentArc,
      emotionalState: (ws as any).emotional_state ?? 'neutral',
      recentScenes: state.bubbles.slice(-3).map(b => b.content).join('\n'),
      mcTraits: '',
    });
    const chosen = state.choices[idx];
    if (chosen) handleAction(chosen);
  }, [state, handleAction, novelId, settings.pilotSensitivity]);

  // Pilot: decision mode auto-advance
  useEffect(() => {
    if (!state.pilotMode || state.isGenerating || state.pilotPaused) return;
    if (state.interactionMode !== 'decision' || state.choices.length === 0) return;
    pilotTimerRef.current = setTimeout(runPilotDecision, pilotDelayMs);
    return () => { if (pilotTimerRef.current) clearTimeout(pilotTimerRef.current); };
  }, [state.pilotMode, state.isGenerating, state.pilotPaused, state.interactionMode, state.choices, pilotDelayMs]);

  // Pilot: cinematic mode auto-advance (tap to continue)
  useEffect(() => {
    if (!state.pilotMode || state.isGenerating || state.pilotPaused) return;
    if (state.interactionMode !== 'cinematic') return;
    const t = setTimeout(() => handleAction('[continue]'), pilotDelayMs);
    return () => clearTimeout(t);
  }, [state.pilotMode, state.isGenerating, state.pilotPaused, state.interactionMode, pilotDelayMs]);

  // Pilot: chapter transition auto-click Next Chapter
  useEffect(() => {
    if (!state.pilotMode || state.isGenerating || state.pilotPaused) return;
    const chapterBubble = state.bubbles.find(b => b.isChapterTransition);
    if (!chapterBubble) return;
    const t = setTimeout(() => handleNextChapterStart(chapterBubble.id), pilotDelayMs);
    return () => clearTimeout(t);
  }, [state.pilotMode, state.isGenerating, state.pilotPaused, state.bubbles, pilotDelayMs]);

  const handleChoiceSelect = (choice: string) => {
    // handleAction reads choiceMapRef internally for roleplay text display.
    // Do NOT addBubble here — that causes double messages.
    handleAction(choice);
  };

  const handleCinematicTap = () => { if (!state.isGenerating) handleAction('[continue]'); };

  const chapterLabel = novel ? `Ch.${state.currentChapter} — ${state.currentArc || novel.title}` : 'Loading…';

  // Nav tabs: 5 items — Story, Characters, Status, World, Items
  const navItems = [
    { key: 'story', icon: <BookOpen size={18} />, label: 'Story' },
    { key: 'characters', icon: <Users size={18} />, label: 'Characters' },
    { key: 'status', icon: <BarChart2 size={18} />, label: 'Status' },
    { key: 'world', icon: <Globe size={18} />, label: 'World' },
    { key: 'inventory', icon: <Package size={18} />, label: 'Items' },
  ] as const;

  const handleMinigameComplete = useCallback(async (result: MinigameResult) => {
    setActiveMinigame(null);
    addBubble({ content: result.outcomeText, isNarrator: true });

    // Apply stat effects to progression record
    if (state.mcUid && Object.keys(result.statEffects).length > 0) {
      try {
        const prog = await getProgression(novelId, state.mcUid);
        if (prog?.id) {
          let stats: Record<string, number> = {};
          try { stats = JSON.parse(prog.stats_json); } catch {}
          for (const [key, delta] of Object.entries(result.statEffects)) {
            stats[key] = (stats[key] ?? 0) + delta;
          }
          await updateProgression(prog.id, { stats_json: JSON.stringify(stats) });
        }
      } catch {}
    }

    // Apply inventory changes
    if (state.mcUid) {
      for (const { item, qty } of result.inventoryChanges) {
        try {
          if (qty > 0) await addItem(novelId, state.mcUid, item, qty);
          else if (qty < 0) await removeItem(novelId, state.mcUid, item, Math.abs(qty));
        } catch {}
      }
    }

    // Apply relationship changes as additive deltas
    if (state.mcUid) {
      for (const { uid, delta } of result.relationshipChanges) {
        try {
          await applyRelationshipDelta(novelId, state.mcUid, uid, delta);
        } catch {}
      }
    }
  }, [addBubble, novelId, state.mcUid]);

  return (
    <div className="h-dvh flex flex-col bg-[#080810] overflow-hidden">
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-800/60 shrink-0">
        <button onClick={() => navigate('/novels')} className="text-gray-400 hover:text-white p-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-white font-semibold text-sm truncate px-2">{chapterLabel}</p>
          {state.currentLocation && <p className="text-gray-500 text-xs">{state.currentLocation}</p>}
        </div>
        <div className="flex items-center gap-1">
          {companionNarratorService.getSettings().enabled && (
            <button
              onClick={() => companionNarratorService.togglePlayPause()}
              title={narratorPlaying ? 'Pause narrator' : 'Resume narrator'}
              className={`p-1.5 rounded-lg transition-all ${narratorPlaying ? 'text-amber-400 bg-amber-900/30' : 'text-gray-600 hover:text-gray-300'}`}
            >
              {narratorPlaying ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          )}
          <button
            onClick={() => dispatch({ type: 'SET_PILOT', val: !state.pilotMode })}
            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${state.pilotMode ? 'bg-blue-700/40 text-blue-300' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {state.pilotMode ? <Pause size={14} /> : <Play size={14} />}
            <span className="text-xs">{state.pilotMode ? 'AUTO' : 'Auto'}</span>
          </button>
        </div>
      </div>

      {/* PILOT PAUSE BANNER */}
      <AnimatePresence>
        {state.pilotPaused && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-yellow-900/30 border-b border-yellow-800/50 px-4 py-2 flex items-center justify-between"
          >
            <p className="text-yellow-300 text-xs">{PILOT_PAUSE_REASONS[state.pilotPauseReason] ?? 'Pilot paused'}</p>
            <button onClick={() => dispatch({ type: 'PILOT_RESUME' })} className="text-xs text-yellow-400 font-semibold underline">Resume</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STREAMING BAR */}
      <AnimatePresence>
        {state.isGenerating && state.streamingText && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-4 py-2 bg-gray-900/80 border-b border-gray-800 text-xs text-gray-400 italic line-clamp-2"
          >
            {state.streamingText.slice(-120)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SKILL UNLOCK TOAST */}
      <AnimatePresence>
        {state.pendingSkillUnlocks.length > 0 && (
          <motion.div
            initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
            className="mx-4 mt-2 bg-purple-900/80 border border-purple-600/50 rounded-xl px-4 py-2 flex items-center justify-between"
          >
            <p className="text-purple-200 text-xs font-semibold">✦ Skill Unlocked: {state.pendingSkillUnlocks[0]}</p>
            <button onClick={() => dispatch({ type: 'CLEAR_SKILL_UNLOCKS' })} className="text-purple-400 text-xs">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ERROR BANNER */}
      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="bg-red-900/30 border-b border-red-800/50 px-4 py-2 flex items-center justify-between"
          >
            <p className="text-red-300 text-xs">{state.error}</p>
            <button onClick={() => dispatch({ type: 'SET_ERROR', err: null })} className="text-red-400 text-xs">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NOVA TTS — STOP / RESUME */}
      <AnimatePresence>
        {provider === 'nova' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex justify-center items-center py-1.5 border-b border-white/10 bg-rose-950/20 shrink-0"
          >
            <button
              onClick={() => {
                if (ttsPaused) {
                  novaSonicService.resume();
                  setTtsPaused(false);
                } else {
                  novaSonicService.stop();
                  setTtsPaused(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-1 rounded-full text-xs font-medium
                         bg-white/10 hover:bg-white/20 transition-colors border border-white/20 text-rose-200"
            >
              {ttsPaused ? <>▶ Resume Reading</> : <>⏸ Stop Reading</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BUBBLE SCROLL AREA */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 py-3 space-y-1 no-scrollbar"
        onClick={state.interactionMode === 'cinematic' ? handleCinematicTap : undefined}
      >
        {state.bubbles.map(b => {
          if (b.isChapterTransition && b.chapterTransitionData) {
            return (
              <ChapterTransitionCard
                key={b.id}
                data={b.chapterTransitionData}
                onAskEden={() => setPanel('eden')}
                onNext={() => handleNextChapterStart(b.id)}
                onPrevChapter={b.chapterTransitionData.completedChapter > 1 ? () => navigate(`/chapters/${novelId}`) : undefined}
              />
            );
          }
          if (b.isEnvironment) return <EnvironmentBubble key={b.id} locationName={b.content} imageUrl={b.environmentImageUrl} />;
          if (b.isNarrator) return <NarratorBubble key={b.id} content={b.content} isStreaming={b.isStreaming} textSize={settings.textSize} />;
          if (b.isUser) return (
            <MessageBubble key={b.id} content={b.content} isUser speaker={novel?.mc_name} mcPortraitPath={novel?.mc_portrait_path || undefined} textSize={settings.textSize} />
          );
          return <MessageBubble key={b.id} speaker={b.speaker} content={b.content} bubbleColor={b.bubbleColor} textSize={settings.textSize} />;
        })}
        {(state.isShowingTyping || (state.isGenerating && !state.streamingText)) && <TypingIndicator />}
      </div>

      {/* INTERACTION AREA */}
      <div className="shrink-0 border-t border-gray-800/60">
        {state.interactionMode === 'cinematic' && !state.isGenerating && (
          <div className="px-4 py-3 text-center text-gray-600 text-xs italic">Tap anywhere to continue</div>
        )}

        {!state.isGenerating && state.interactionMode !== 'cinematic' && (
          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="px-3 py-3 space-y-2"
          >
            {state.interactionMode === 'decision' && state.choices.length > 0 && (
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="space-y-2 max-h-52 overflow-y-auto"
              >
                {state.choices.map((c, i) => {
                  const mapped = choiceMapRef.current[c];
                  return (
                    <ChoiceButton
                      key={i}
                      text={c}
                      roleplayText={mapped?.roleplayText}
                      index={i}
                      onClick={() => handleChoiceSelect(c)}
                      disabled={false}
                    />
                  );
                })}
              </motion.div>
            )}
            <CustomActionInput
              onSubmit={handleAction}
              disabled={false}
              placeholder={state.interactionMode === 'decision' && state.choices.length > 0 ? 'Or write your own action…' : 'What do you do?'}
            />
          </motion.div>
        )}

        {state.isGenerating && (
          <div className="px-4 py-3 flex items-center gap-2 text-gray-500 text-xs">
            <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
            Generating…
          </div>
        )}
      </div>

      {/* BOTTOM NAV TABS */}
      <div className="flex border-t border-gray-800/60 bg-[#0a0a14] shrink-0">
        {navItems.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              if (tab.key === 'story') { setPanel(null); return; }
              setPanel(panel === tab.key ? null : tab.key as Panel);
            }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] xs:text-xs transition-colors ${panel === tab.key ? 'text-blue-400' : 'text-gray-600 hover:text-gray-400'}`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* PANELS */}
      <CharacterPanel open={panel === 'characters'} onClose={() => setPanel(null)} novelId={novelId} />
      <StatusPanel
        open={panel === 'status'}
        onClose={() => setPanel(null)}
        genre={state.genre}
        novelId={novelId}
        mcUid={state.mcUid}
        onOpenSkillTree={() => { setPanel(null); setShowSkillTree(true); }}
      />
      <WorldPanel open={panel === 'world'} onClose={() => setPanel(null)} novelId={novelId} />
      <AskEdenPanel open={panel === 'eden'} onClose={() => setPanel(null)} novelId={novelId} timelineId={state.timelineId} />
      <InventoryPanel open={panel === 'inventory'} onClose={() => setPanel(null)} novelId={novelId} mcUid={state.mcUid} />

      {/* SKILL TREE OVERLAY */}
      <SkillTreeOverlay open={showSkillTree} onClose={() => setShowSkillTree(false)} skills={progressionSkills} genre={state.genre} />

      {/* LEVEL UP OVERLAY */}
      <AnimatePresence>
        {state.pendingLevelUp && (
          <LevelUpOverlay
            result={state.pendingLevelUp}
            novelId={novelId}
            mcUid={state.mcUid}
            genre={state.genre}
            onDone={() => dispatch({ type: 'SET_LEVEL_UP', result: null })}
          />
        )}
      </AnimatePresence>

      <LoadingOverlay visible={!initialized} message={loadingMsg} />

      {/* MINIGAME OVERLAY */}
      <AnimatePresence>
        {activeMinigame && (
          <MinigameWrapper
            type={activeMinigame}
            genre={state.genre}
            onComplete={handleMinigameComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
