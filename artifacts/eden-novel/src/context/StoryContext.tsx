import { createContext, useContext, useReducer, ReactNode } from 'react'
import type {
  Novel,
  Character,
  WorldState,
  ChoiceOption,
  ChatItem,
  InteractionMode,
  ScenePlan,
} from '../types'

interface StoryState {
  novel: Novel | null
  characters: Character[]
  worldState: WorldState | null
  chatItems: ChatItem[]
  choices: ChoiceOption[]
  interactionMode: InteractionMode
  isGenerating: boolean
  scenePlan: ScenePlan | null
  activePanel: string | null
  streamingId: string | null
}

type StoryAction =
  | { type: 'SET_NOVEL'; novel: Novel }
  | { type: 'SET_CHARACTERS'; characters: Character[] }
  | { type: 'UPDATE_CHARACTER'; character: Character }
  | { type: 'SET_WORLD_STATE'; ws: WorldState }
  | { type: 'ADD_ITEMS'; items: ChatItem[] }
  | { type: 'PUSH_ITEM'; item: ChatItem }
  | { type: 'UPDATE_STREAMING'; id: string; content: string }
  | { type: 'REPLACE_STREAMING'; id: string; items: ChatItem[] }
  | { type: 'SET_CHOICES'; choices: ChoiceOption[] }
  | { type: 'SET_INTERACTION_MODE'; mode: InteractionMode }
  | { type: 'SET_GENERATING'; value: boolean }
  | { type: 'SET_SCENE_PLAN'; plan: ScenePlan | null }
  | { type: 'SET_ACTIVE_PANEL'; panel: string | null }
  | { type: 'SET_STREAMING_ID'; id: string | null }
  | { type: 'RESET' }

const initialState: StoryState = {
  novel: null,
  characters: [],
  worldState: null,
  chatItems: [],
  choices: [],
  interactionMode: 'decision',
  isGenerating: false,
  scenePlan: null,
  activePanel: null,
  streamingId: null,
}

function storyReducer(state: StoryState, action: StoryAction): StoryState {
  switch (action.type) {
    case 'SET_NOVEL':
      return { ...state, novel: action.novel }

    case 'SET_CHARACTERS':
      return { ...state, characters: action.characters }

    case 'UPDATE_CHARACTER':
      return {
        ...state,
        characters: state.characters.map(c =>
          c.internal_uid === action.character.internal_uid ? action.character : c
        ),
      }

    case 'SET_WORLD_STATE':
      return { ...state, worldState: action.ws }

    case 'ADD_ITEMS':
      return { ...state, chatItems: [...state.chatItems, ...action.items] }

    case 'PUSH_ITEM':
      return { ...state, chatItems: [...state.chatItems, action.item] }

    case 'UPDATE_STREAMING':
      return {
        ...state,
        chatItems: state.chatItems.map(item =>
          item.kind === 'streaming' && item.id === action.id
            ? { ...item, content: action.content }
            : item
        ),
      }

    case 'REPLACE_STREAMING':
      return {
        ...state,
        chatItems: state.chatItems.flatMap(item =>
          item.kind === 'streaming' && item.id === action.id ? action.items : [item]
        ),
        streamingId: null,
      }

    case 'SET_CHOICES':
      return { ...state, choices: action.choices }

    case 'SET_INTERACTION_MODE':
      return { ...state, interactionMode: action.mode }

    case 'SET_GENERATING':
      return { ...state, isGenerating: action.value }

    case 'SET_SCENE_PLAN':
      return { ...state, scenePlan: action.plan }

    case 'SET_ACTIVE_PANEL':
      return { ...state, activePanel: action.panel }

    case 'SET_STREAMING_ID':
      return { ...state, streamingId: action.id }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

interface StoryContextValue {
  state: StoryState
  dispatch: React.Dispatch<StoryAction>
}

const StoryContext = createContext<StoryContextValue>(null!)

export function StoryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(storyReducer, initialState)
  return (
    <StoryContext.Provider value={{ state, dispatch }}>
      {children}
    </StoryContext.Provider>
  )
}

export function useStory() {
  return useContext(StoryContext)
}
