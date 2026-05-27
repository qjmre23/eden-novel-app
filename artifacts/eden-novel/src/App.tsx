import { ModelProvider } from './context/ModelContext'
import { AppProvider }   from './context/AppContext'
import { StoryProvider } from './context/StoryContext'
import { AppRouter }     from './router'

export default function App() {
  return (
    <ModelProvider>
      <AppProvider>
        <StoryProvider>
          {/* Noise overlay — fixed, always on top */}
          <div className="noise-overlay" aria-hidden />
          <AppRouter />
        </StoryProvider>
      </AppProvider>
    </ModelProvider>
  )
}
