import React, { createContext, useContext, useReducer } from 'react';
import type { LevelUpResult } from '../services/progressionService';

export interface Bubble {
  id: string;
  speaker?: string;
  content: string;
  isNarrator?: boolean;
  isUser?: boolean;
  isTyping?: boolean;
  isStreaming?: boolean;
  bubbleColor?: string;
  isEnvironment?: boolean;
  environmentImageUrl?: string | null;
  isChapterTransition?: boolean;
  chapterTransitionData?: {
    completedChapter: number;
    newChapter: number;
    newChapterId: number;
    title: string;
  };
  timestamp: number;
}

interface StoryState {
  novelId: number | null;
  mcUid: string;
  genre: string;
  timelineId: string;
  bubbles: Bubble[];
  interactionMode: 'cinematic' | 'decision' | 'roleplay' | 'passive';
  choices: string[];
  isGenerating: boolean;
  isShowingTyping: boolean;
  pilotMode: boolean;
  pilotPaused: boolean;
  pilotPauseReason: string;
  pendingLevelUp: LevelUpResult | null;
  pendingSkillUnlocks: string[];
  currentChapter: number;
  currentLocation: string;
  currentArc: string;
  streamingText: string;
  error: string | null;
  actionCount: number;
}

type StoryAction =
  | { type: 'SET_NOVEL'; novelId: number; mcUid: string; genre: string; timelineId: string }
  | { type: 'LOAD_BUBBLES'; bubbles: Bubble[] }
  | { type: 'ADD_BUBBLE'; bubble: Bubble }
  | { type: 'REMOVE_BUBBLE'; id: string }
  | { type: 'UPDATE_STREAMING'; text: string }
  | { type: 'FINISH_STREAMING' }
  | { type: 'SET_INTERACTION'; mode: StoryState['interactionMode']; choices?: string[] }
  | { type: 'SET_GENERATING'; val: boolean }
  | { type: 'SET_TYPING' }
  | { type: 'CLEAR_TYPING' }
  | { type: 'SET_PILOT'; val: boolean }
  | { type: 'PILOT_PAUSE'; reason: string }
  | { type: 'PILOT_RESUME' }
  | { type: 'SET_LEVEL_UP'; result: LevelUpResult | null }
  | { type: 'ADD_SKILL_UNLOCK'; skill: string }
  | { type: 'CLEAR_SKILL_UNLOCKS' }
  | { type: 'SET_CHAPTER'; n: number }
  | { type: 'SET_LOCATION'; loc: string }
  | { type: 'SET_ARC'; arc: string }
  | { type: 'SET_ERROR'; err: string | null }
  | { type: 'CLEAR_BUBBLES' }
  | { type: 'INCREMENT_ACTION' }
  | { type: 'SET_ACTION_COUNT'; n: number }
  | { type: 'RESET_ACTION_COUNT' };

const initialState: StoryState = {
  novelId: null,
  mcUid: '',
  genre: '',
  timelineId: '',
  bubbles: [],
  interactionMode: 'roleplay',
  choices: [],
  isGenerating: false,
  isShowingTyping: false,
  pilotMode: false,
  pilotPaused: false,
  pilotPauseReason: '',
  pendingLevelUp: null,
  pendingSkillUnlocks: [],
  currentChapter: 1,
  currentLocation: '',
  currentArc: '',
  streamingText: '',
  error: null,
  actionCount: 0,
};

function reducer(state: StoryState, action: StoryAction): StoryState {
  switch (action.type) {
    case 'SET_NOVEL':
      return { ...state, novelId: action.novelId, mcUid: action.mcUid, genre: action.genre, timelineId: action.timelineId, bubbles: [], streamingText: '', actionCount: 0 };
    case 'LOAD_BUBBLES':
      return { ...state, bubbles: action.bubbles, streamingText: '' };
    case 'ADD_BUBBLE':
      return { ...state, bubbles: [...state.bubbles, action.bubble], streamingText: '' };
    case 'REMOVE_BUBBLE':
      return { ...state, bubbles: state.bubbles.filter(b => b.id !== action.id) };
    case 'UPDATE_STREAMING':
      return { ...state, streamingText: action.text };
    case 'FINISH_STREAMING':
      return { ...state, streamingText: '' };
    case 'SET_INTERACTION':
      return { ...state, interactionMode: action.mode, choices: action.choices ?? [] };
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.val };
    case 'SET_TYPING':
      return { ...state, isShowingTyping: true };
    case 'CLEAR_TYPING':
      return { ...state, isShowingTyping: false };
    case 'SET_PILOT':
      return { ...state, pilotMode: action.val, pilotPaused: false };
    case 'PILOT_PAUSE':
      return { ...state, pilotPaused: true, pilotPauseReason: action.reason };
    case 'PILOT_RESUME':
      return { ...state, pilotPaused: false, pilotPauseReason: '' };
    case 'SET_LEVEL_UP':
      return { ...state, pendingLevelUp: action.result };
    case 'ADD_SKILL_UNLOCK':
      return { ...state, pendingSkillUnlocks: [...state.pendingSkillUnlocks, action.skill] };
    case 'CLEAR_SKILL_UNLOCKS':
      return { ...state, pendingSkillUnlocks: [] };
    case 'SET_CHAPTER':
      return { ...state, currentChapter: action.n };
    case 'SET_LOCATION':
      return { ...state, currentLocation: action.loc };
    case 'SET_ARC':
      return { ...state, currentArc: action.arc };
    case 'SET_ERROR':
      return { ...state, error: action.err };
    case 'CLEAR_BUBBLES':
      return { ...state, bubbles: [], streamingText: '' };
    case 'INCREMENT_ACTION':
      return { ...state, actionCount: state.actionCount + 1 };
    case 'SET_ACTION_COUNT':
      return { ...state, actionCount: action.n };
    case 'RESET_ACTION_COUNT':
      return { ...state, actionCount: 0 };
    default:
      return state;
  }
}

interface StoryContextValue {
  state: StoryState;
  dispatch: React.Dispatch<StoryAction>;
}

const StoryContext = createContext<StoryContextValue | null>(null);

export function StoryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <StoryContext.Provider value={{ state, dispatch }}>{children}</StoryContext.Provider>;
}

export function useStory() {
  const ctx = useContext(StoryContext);
  if (!ctx) throw new Error('useStory must be used within StoryProvider');
  return ctx;
}
