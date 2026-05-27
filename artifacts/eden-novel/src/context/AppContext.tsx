import { createContext, useContext, useReducer, ReactNode } from 'react'
import type { EdenSession } from '../types'

interface AppState {
  session: EdenSession | null
  isDev: boolean
  autoPilot: boolean
  reducedMotion: boolean
}

type AppAction =
  | { type: 'SET_SESSION'; session: EdenSession }
  | { type: 'CLEAR_SESSION' }
  | { type: 'TOGGLE_DEV' }
  | { type: 'SET_AUTOPILOT'; value: boolean }
  | { type: 'SET_REDUCED_MOTION'; value: boolean }

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, session: action.session }
    case 'CLEAR_SESSION':
      return { ...state, session: null }
    case 'TOGGLE_DEV':
      return { ...state, isDev: !state.isDev }
    case 'SET_AUTOPILOT':
      return { ...state, autoPilot: action.value }
    case 'SET_REDUCED_MOTION':
      return { ...state, reducedMotion: action.value }
    default:
      return state
  }
}

function loadInitial(): AppState {
  let session: EdenSession | null = null
  try {
    const raw = localStorage.getItem('eden_session')
    if (raw) session = JSON.parse(raw)
  } catch {}
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  return { session, isDev: false, autoPilot: false, reducedMotion }
}

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

const AppContext = createContext<AppContextValue>(null!)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, loadInitial)

  const wrappedDispatch: React.Dispatch<AppAction> = (action) => {
    dispatch(action)
    if (action.type === 'SET_SESSION') {
      localStorage.setItem('eden_session', JSON.stringify(action.session))
    } else if (action.type === 'CLEAR_SESSION') {
      localStorage.removeItem('eden_session')
    }
  }

  return (
    <AppContext.Provider value={{ state, dispatch: wrappedDispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
