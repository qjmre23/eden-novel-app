import React, { createContext, useContext, useEffect, useReducer } from 'react';

interface AppState {
  theme: 'dark' | 'amoled' | 'light';
  bubbleDelay: number;
  autoChapterEvery: number;
  textSize: 'small' | 'medium' | 'large';
  pilotSensitivity: 'sensitive' | 'normal' | 'relaxed';
  novaTtsEnabled: boolean;
}

type AppAction =
  | { type: 'SET_THEME'; theme: AppState['theme'] }
  | { type: 'SET_BUBBLE_DELAY'; delay: number }
  | { type: 'SET_AUTO_CHAPTER'; every: number }
  | { type: 'SET_TEXT_SIZE'; size: AppState['textSize'] }
  | { type: 'SET_PILOT_SENSITIVITY'; s: AppState['pilotSensitivity'] }
  | { type: 'SET_NOVA_TTS'; enabled: boolean };

function applyTheme(theme: AppState['theme']): void {
  if (typeof document !== 'undefined') {
    document.documentElement.className = `theme-${theme}`;
  }
}

function loadSettings(): AppState {
  try {
    const raw = localStorage.getItem('eden_settings');
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const { maxTokens: _mt, temperature: _temp, ...rest } = parsed as Record<string, unknown>;
      void _mt; void _temp;
      return { ...defaultState, ...rest } as AppState;
    }
  } catch {}
  return defaultState;
}

const defaultState: AppState = {
  theme: 'dark',
  bubbleDelay: 300,
  autoChapterEvery: 10,
  textSize: 'medium',
  pilotSensitivity: 'normal',
  novaTtsEnabled: false,
};

function reducer(state: AppState, action: AppAction): AppState {
  let next: AppState;
  switch (action.type) {
    case 'SET_THEME': next = { ...state, theme: action.theme }; break;
    case 'SET_BUBBLE_DELAY': next = { ...state, bubbleDelay: action.delay }; break;
    case 'SET_AUTO_CHAPTER': next = { ...state, autoChapterEvery: action.every }; break;
    case 'SET_TEXT_SIZE': next = { ...state, textSize: action.size }; break;
    case 'SET_PILOT_SENSITIVITY': next = { ...state, pilotSensitivity: action.s }; break;
    case 'SET_NOVA_TTS': next = { ...state, novaTtsEnabled: action.enabled }; break;
    default: return state;
  }
  localStorage.setItem('eden_settings', JSON.stringify(next));
  applyTheme(next.theme);
  return next;
}

interface AppContextValue {
  settings: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, dispatch] = useReducer(reducer, undefined, () => {
    const s = loadSettings();
    applyTheme(s.theme);
    return s;
  });

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  return <AppContext.Provider value={{ settings, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppProvider');
  return ctx;
}
