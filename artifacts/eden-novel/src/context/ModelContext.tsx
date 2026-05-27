import { createContext, useContext, useReducer, ReactNode } from 'react'
import { modelService, type AIProvider } from '../services/modelService'

interface ModelState {
  provider: string | null
  apiKey: string | null
  isMock: boolean
}

type ModelAction =
  | { type: 'SET_PROVIDER'; provider: string; apiKey?: string }
  | { type: 'USE_MOCK' }
  | { type: 'CLEAR' }

// Map a UI provider id to the backend's AIProvider value.
const UI_TO_BACKEND_PROVIDER: Record<string, AIProvider> = {
  huggingface: 'huggingface',
  grok: 'grok',
  gemini: 'gemini',
  openai: 'openai',
  claude: 'claude',
  deepseek: 'deepseek',
  bedrock: 'bedrock',
}

function persistProviderSelection(provider: string | null, apiKey?: string | null) {
  if (!provider || provider === 'mock') return
  const backendProvider = UI_TO_BACKEND_PROVIDER[provider]
  if (!backendProvider) return
  try {
    localStorage.setItem('ai_provider', backendProvider)
    if (apiKey && apiKey.trim()) {
      modelService.saveApiKey(backendProvider, apiKey.trim())
      if (backendProvider === 'huggingface') {
        localStorage.setItem('hf_token', apiKey.trim())
        ;(modelService as any).hfToken = apiKey.trim()
      }
    }
  } catch {}
}

function modelReducer(state: ModelState, action: ModelAction): ModelState {
  switch (action.type) {
    case 'SET_PROVIDER':
      persistProviderSelection(action.provider, action.apiKey)
      return { provider: action.provider, apiKey: action.apiKey ?? null, isMock: false }
    case 'USE_MOCK':
      return { provider: 'mock', apiKey: null, isMock: true }
    case 'CLEAR':
      try { localStorage.removeItem('ai_provider') } catch {}
      return { provider: null, apiKey: null, isMock: false }
    default:
      return state
  }
}

function loadInitial(): ModelState {
  try {
    const backendProvider = (typeof localStorage !== 'undefined' && localStorage.getItem('ai_provider')) || null
    if (backendProvider) {
      return { provider: backendProvider, apiKey: null, isMock: false }
    }
    const raw = localStorage.getItem('eden_settings')
    if (!raw) return { provider: 'mock', apiKey: null, isMock: true }
    const s = JSON.parse(raw)
    return {
      provider: s.provider ?? 'mock',
      apiKey: s.apiKey ?? null,
      isMock: s.provider === 'mock' || !s.provider,
    }
  } catch {
    return { provider: 'mock', apiKey: null, isMock: true }
  }
}

interface ModelContextValue {
  state: ModelState
  dispatch: React.Dispatch<ModelAction>
}

const ModelContext = createContext<ModelContextValue>(null!)

export function ModelProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(modelReducer, undefined, loadInitial)

  const wrappedDispatch: React.Dispatch<ModelAction> = (action) => {
    dispatch(action)
    if (action.type === 'SET_PROVIDER') {
      localStorage.setItem('eden_settings', JSON.stringify({
        provider: action.provider,
        apiKey: action.apiKey,
        savedAt: Date.now(),
      }))
    } else if (action.type === 'USE_MOCK') {
      localStorage.setItem('eden_settings', JSON.stringify({
        provider: 'mock',
        savedAt: Date.now(),
      }))
    } else if (action.type === 'CLEAR') {
      localStorage.removeItem('eden_settings')
    }
  }

  return (
    <ModelContext.Provider value={{ state, dispatch: wrappedDispatch }}>
      {children}
    </ModelContext.Provider>
  )
}

export function useModel() {
  return useContext(ModelContext)
}
