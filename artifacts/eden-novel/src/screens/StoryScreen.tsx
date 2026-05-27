import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoute, useLocation } from 'wouter'
import {
  ArrowLeft, Settings, Play, Pause,
  Users, BarChart2, Globe, Package, MessageSquare,
} from 'lucide-react'
import { adapter, parseChoicesFromScene } from '../services/adapter'
import { parseBubbles } from '../parsers/tagParser'
import { useStory } from '../context/StoryContext'
import { useApp } from '../context/AppContext'
import { TensionBar } from '../components/badges/TensionBar'
import { MessageBubble } from '../components/chat/MessageBubble'
import { NarratorBubble } from '../components/chat/NarratorBubble'
import { MCEchoBubble } from '../components/chat/MCEchoBubble'
import { TypingIndicator } from '../components/chat/TypingIndicator'
import { EnvironmentBubble } from '../components/chat/EnvironmentBubble'
import { ChapterTransitionCard } from '../components/chat/ChapterTransitionCard'
import { ScrollToBottomPill } from '../components/chat/ScrollToBottomPill'
import { ChoiceButton } from '../components/choice/ChoiceButton'
import { CustomActionInput } from '../components/choice/CustomActionInput'
import { AnimatedPanel } from '../components/common/AnimatedPanel'
import { CharacterPanel } from '../panels/CharacterPanel'
import { StatusPanel } from '../panels/StatusPanel'
import { WorldPanel } from '../panels/WorldPanel'
import { InventoryPanel } from '../panels/InventoryPanel'
import { AskEdenPanel } from '../panels/AskEdenPanel'
import type { ChatItem, Character } from '../types'

let ITEM_COUNTER = 0
function itemId(): string { return `item-${++ITEM_COUNTER}` }

export function StoryScreen() {
  const [match, params] = useRoute('/story/:novelId')
  const [, navigate]    = useLocation()
  const novelId         = parseInt((params as any)?.novelId ?? '0')

  const { state, dispatch } = useStory()
  const { state: appState, dispatch: appDispatch } = useApp()

  const chatRef        = useRef<HTMLDivElement>(null)
  const streamBuffer   = useRef('')
  const [atBottom, setAtBottom]     = useState(true)
  const [showPill, setShowPill]     = useState(false)
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const autoPilotTimer = useRef<ReturnType<typeof setTimeout>>(null as any)

  // ── Load novel data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!novelId) return
    ;(async () => {
      const [novel, characters, ws] = await Promise.all([
        adapter.loadNovel(novelId),
        adapter.loadCharacters(novelId),
        adapter.loadWorldState(novelId),
      ])
      dispatch({ type: 'SET_NOVEL', novel })
      dispatch({ type: 'SET_CHARACTERS', characters })
      dispatch({ type: 'SET_WORLD_STATE', ws })

      // Push environment card at top
      dispatch({
        type: 'PUSH_ITEM',
        item: {
          kind: 'environment',
          location: ws.current_location,
          timeOfDay: ws.time_of_day,
          weather: ws.weather,
          genre: ws.genre,
          id: itemId(),
        },
      })

      // Generate opening
      await generateOpening(novelId, characters)
    })()
    return () => { dispatch({ type: 'RESET' }) }
  }, [novelId])

  // ── Scroll to bottom ─────────────────────────────────────────────────────
  useEffect(() => {
    if (atBottom) {
      chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
    } else {
      setShowPill(true)
    }
  }, [state.chatItems])

  function handleScroll() {
    const el = chatRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setAtBottom(isNearBottom)
    if (isNearBottom) setShowPill(false)
  }

  function scrollToBottom() {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
    setAtBottom(true)
    setShowPill(false)
  }

  // ── Generate opening ─────────────────────────────────────────────────────
  async function generateOpening(nId: number, chars: Character[]) {
    const streamId = itemId()
    dispatch({ type: 'PUSH_ITEM', item: { kind: 'streaming', content: '', id: streamId } })
    dispatch({ type: 'SET_GENERATING', value: true })
    dispatch({ type: 'SET_STREAMING_ID', id: streamId })
    dispatch({ type: 'SET_INTERACTION_MODE', mode: 'generating' })
    streamBuffer.current = ''
    setAtBottom(true)

    const fullText = await adapter.generateOpeningStream(nId, token => {
      streamBuffer.current += token
      dispatch({ type: 'UPDATE_STREAMING', id: streamId, content: streamBuffer.current })
    })

    finishStream(streamId, fullText, chars)
  }

  // ── Finish streaming: parse + replace ────────────────────────────────────
  function finishStream(streamId: string, fullText: string, chars: Character[]) {
    const aliveNames = chars.filter(c => c.status === 'alive').map(c => c.display_name)
    const bubbles    = parseBubbles(fullText, aliveNames)
    const choices    = parseChoicesFromScene(fullText)

    const items: ChatItem[] = bubbles.map(b => ({
      kind: 'bubble' as const,
      bubble: b,
      id: itemId(),
      character: chars.find(c => c.display_name === b.speaker),
    }))

    dispatch({ type: 'REPLACE_STREAMING', id: streamId, items })
    dispatch({ type: 'SET_CHOICES', choices })
    dispatch({ type: 'SET_GENERATING', value: false })
    dispatch({ type: 'SET_INTERACTION_MODE', mode: choices.length > 0 ? 'decision' : 'free' })
    setAtBottom(true)
  }

  // ── Handle choice selection ──────────────────────────────────────────────
  const handleChoice = useCallback(async (choiceIdx: number) => {
    if (state.interactionMode === 'generating') return
    const choice = state.choices[choiceIdx]
    if (!choice) return

    // MC echo bubble
    const echoContent = choice.roleplayText ?? choice.label
    dispatch({
      type: 'PUSH_ITEM',
      item: { kind: 'mc-echo', content: echoContent, id: itemId() },
    })
    dispatch({ type: 'SET_CHOICES', choices: [] })

    await runScene(choice.label)
  }, [state.choices, state.interactionMode])

  // ── Handle custom action ─────────────────────────────────────────────────
  const handleCustomAction = useCallback(async (text: string) => {
    if (state.interactionMode === 'generating') return
    dispatch({
      type: 'PUSH_ITEM',
      item: { kind: 'mc-echo', content: text, id: itemId() },
    })
    dispatch({ type: 'SET_CHOICES', choices: [] })
    await runScene(text)
  }, [state.interactionMode])

  // ── Core scene runner ────────────────────────────────────────────────────
  async function runScene(userAction: string) {
    dispatch({ type: 'SET_INTERACTION_MODE', mode: 'generating' })
    dispatch({ type: 'SET_GENERATING', value: true })
    setAtBottom(true)

    const streamId = itemId()
    dispatch({ type: 'PUSH_ITEM', item: { kind: 'streaming', content: '', id: streamId } })
    dispatch({ type: 'SET_STREAMING_ID', id: streamId })
    streamBuffer.current = ''

    const fullText = await adapter.generateNextSceneStream({
      novelId,
      userAction,
      onToken: token => {
        streamBuffer.current += token
        dispatch({ type: 'UPDATE_STREAMING', id: streamId, content: streamBuffer.current })
      },
      onScenePlan: plan => dispatch({ type: 'SET_SCENE_PLAN', plan }),
    })

    // Refresh after scene
    const { tension, characters, ws } = await adapter.refreshAfterScene(novelId)
    dispatch({ type: 'SET_CHARACTERS', characters })
    dispatch({ type: 'SET_WORLD_STATE', ws })
    finishStream(streamId, fullText, characters)
  }

  // ── Auto-pilot ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!appState.autoPilot || state.interactionMode !== 'decision' || state.choices.length === 0) return
    autoPilotTimer.current = setTimeout(() => {
      const idx = Math.floor(Math.random() * state.choices.length)
      handleChoice(idx)
    }, 2000)
    return () => clearTimeout(autoPilotTimer.current)
  }, [appState.autoPilot, state.interactionMode, state.choices])

  // ── Tension from worldState ──────────────────────────────────────────────
  const tension = state.worldState?.narrative_tension ?? 0

  // ── Panel icons ──────────────────────────────────────────────────────────
  const PANEL_ICONS = [
    { id: 'characters', Icon: Users,        title: 'Characters' },
    { id: 'stats',      Icon: BarChart2,     title: 'Status' },
    { id: 'world',      Icon: Globe,         title: 'World' },
    { id: 'inventory',  Icon: Package,       title: 'Inventory' },
    { id: 'eden',       Icon: MessageSquare, title: 'Ask Eden' },
  ]

  if (!match) return null

  return (
    <div className="eden-gradient-bg h-dvh flex flex-col overflow-hidden">
      <div className="noise-overlay" />

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div
        className="relative z-20 flex items-center gap-3 px-4 pt-safe"
        style={{
          background: 'rgba(10,10,15,0.9)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          minHeight: 52,
        }}
      >
        <button
          onClick={() => navigate('/novels')}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[#7a7a8c] hover:text-[#e6e6f0] transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0 text-center">
          <p className="text-[11px] font-mono-eden uppercase tracking-widest text-[#7a7a8c]">
            Ch.{state.worldState?.current_chapter ?? 1}
          </p>
          <h2 className="text-[13px] font-medium text-[#e6e6f0] truncate">
            {state.novel?.title ?? '…'}
          </h2>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Settings */}
          <button className="w-8 h-8 rounded-xl flex items-center justify-center text-[#7a7a8c] hover:text-[#e6e6f0] transition-colors">
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Auto-pilot toggle */}
          <motion.button
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
            style={{
              background: appState.autoPilot ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: appState.autoPilot ? '#818cf8' : '#7a7a8c',
              boxShadow: appState.autoPilot ? '0 0 12px rgba(99,102,241,0.3)' : 'none',
            }}
            onClick={() => appDispatch({ type: 'SET_AUTOPILOT', value: !appState.autoPilot })}
            whileTap={{ scale: 0.9 }}
            title="Auto-pilot"
          >
            {appState.autoPilot ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </motion.button>
        </div>
      </div>

      {/* ── Tension bar ────────────────────────────────────────────────── */}
      <div className="relative z-20">
        <TensionBar
          tension={tension}
          scenePlan={state.scenePlan}
          isDev={appState.isDev}
        />
      </div>

      {/* ── Main layout: chat + side rail ────────────────────────────── */}
      <div className="flex flex-1 min-h-0 relative">

        {/* ── Chat scroll area ─────────────────────────────────────────── */}
        <div
          ref={chatRef}
          className="flex-1 chat-scroll chat-fade-mask overflow-y-auto"
          style={{ paddingBottom: 0 }}
          onScroll={handleScroll}
        >
          <div className="px-4 py-4 space-y-4 min-h-full">
            <AnimatePresence mode="popLayout">
              {state.chatItems.map((item, idx) => {
                const delay = Math.min((idx * 0.08), 0.4)

                switch (item.kind) {
                  case 'environment':
                    return (
                      <motion.div key={item.id} layout>
                        <EnvironmentBubble
                          location={item.location}
                          timeOfDay={item.timeOfDay}
                          weather={item.weather}
                          genre={item.genre}
                        />
                      </motion.div>
                    )

                  case 'chapter':
                    return (
                      <motion.div key={item.id} layout>
                        <ChapterTransitionCard chapter={item.chapter} title={item.title} />
                      </motion.div>
                    )

                  case 'bubble':
                    if (item.bubble.isNarrator) {
                      return (
                        <motion.div key={item.id} layout>
                          <NarratorBubble content={item.bubble.content} delay={delay} />
                        </motion.div>
                      )
                    }
                    return (
                      <motion.div key={item.id} layout>
                        <MessageBubble
                          speaker={item.bubble.speaker ?? 'Unknown'}
                          content={item.bubble.content}
                          character={item.character}
                          delay={delay}
                        />
                      </motion.div>
                    )

                  case 'streaming':
                    return (
                      <motion.div key={item.id} layout className="space-y-3">
                        {item.content ? (
                          <div className="space-y-3">
                            {item.content.split('\n').filter(Boolean).map((line, li) => (
                              <NarratorBubble key={li} content={line} delay={li * 0.05} />
                            ))}
                          </div>
                        ) : (
                          <TypingIndicator />
                        )}
                      </motion.div>
                    )

                  case 'mc-echo':
                    return (
                      <motion.div key={item.id} layout>
                        <MCEchoBubble content={item.content} />
                      </motion.div>
                    )

                  default:
                    return null
                }
              })}
            </AnimatePresence>

            {/* Typing indicator while generating */}
            <AnimatePresence>
              {state.isGenerating && !state.streamingId && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TypingIndicator />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom padding for choice rail */}
            <div className="h-2" />
          </div>
        </div>

        {/* ── Side panel icon rail ──────────────────────────────────────── */}
        <div className="hidden md:flex flex-col items-center gap-1 px-1.5 py-4 border-l border-white/05" style={{ background: 'rgba(10,10,15,0.6)' }}>
          {PANEL_ICONS.map(({ id, Icon, title }) => (
            <button
              key={id}
              onClick={() => setActivePanel(p => p === id ? null : id)}
              title={title}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
              style={{
                background: activePanel === id ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: activePanel === id ? '#818cf8' : '#7a7a8c',
              }}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* ── Scroll-to-bottom pill ──────────────────────────────────── */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <ScrollToBottomPill visible={showPill} onClick={scrollToBottom} />
        </div>
      </div>

      {/* ── Bottom area: choices + input ────────────────────────────── */}
      <div
        className="relative z-20 border-t border-white/05 pb-safe"
        style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(20px)' }}
      >
        {/* Choice rail */}
        <AnimatePresence>
          {state.interactionMode === 'decision' && state.choices.length > 0 && (
            <motion.div
              className="px-4 pt-3 space-y-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
            >
              {state.choices.map((choice, i) => (
                <ChoiceButton
                  key={i}
                  text={choice.label}
                  roleplayText={choice.roleplayText}
                  index={i}
                  onClick={() => handleChoice(i)}
                  disabled={state.isGenerating}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom action input */}
        <div className="px-4 py-3">
          <CustomActionInput
            onSubmit={handleCustomAction}
            isGenerating={state.isGenerating}
            disabled={false}
          />
        </div>

        {/* Mobile panel icons */}
        <div className="flex justify-around items-center pb-3 px-4 md:hidden">
          {PANEL_ICONS.map(({ id, Icon, title }) => (
            <button
              key={id}
              onClick={() => setActivePanel(p => p === id ? null : id)}
              title={title}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
              style={{
                background: activePanel === id ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: activePanel === id ? '#818cf8' : '#7a7a8c',
              }}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* ── Side panels ──────────────────────────────────────────────── */}
      <AnimatedPanel
        isOpen={activePanel === 'characters'}
        onClose={() => setActivePanel(null)}
        title="Characters"
        side="bottom"
      >
        <CharacterPanel characters={state.characters} />
      </AnimatedPanel>

      <AnimatedPanel
        isOpen={activePanel === 'stats'}
        onClose={() => setActivePanel(null)}
        title="Status"
        side="bottom"
      >
        {state.novel && <StatusPanel novel={state.novel} tension={tension} />}
      </AnimatedPanel>

      <AnimatedPanel
        isOpen={activePanel === 'world'}
        onClose={() => setActivePanel(null)}
        title="World"
        side="bottom"
      >
        {state.worldState && <WorldPanel worldState={state.worldState} />}
      </AnimatedPanel>

      <AnimatedPanel
        isOpen={activePanel === 'inventory'}
        onClose={() => setActivePanel(null)}
        title="Inventory"
        side="bottom"
      >
        <InventoryPanel />
      </AnimatedPanel>

      <AnimatedPanel
        isOpen={activePanel === 'eden'}
        onClose={() => setActivePanel(null)}
        title="Ask Eden"
        side="bottom"
      >
        <AskEdenPanel />
      </AnimatedPanel>
    </div>
  )
}
