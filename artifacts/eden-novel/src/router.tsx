import { Route, Switch } from 'wouter'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'wouter'
import { SplashScreen }      from './screens/SplashScreen'
import { AuthScreen }        from './screens/AuthScreen'
import { ModelSetupScreen }  from './screens/ModelSetupScreen'
import { NovelsScreen }      from './screens/NovelsScreen'
import { NewNovelScreen }    from './screens/NewNovelScreen'
import { MCSetupScreen }     from './screens/MCSetupScreen'
import { StoryScreen }       from './screens/StoryScreen'

const PAGE_VARIANTS = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      {children}
    </motion.div>
  )
}

export function AppRouter() {
  const [location] = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Switch key={location}>
        <Route path="/">
          <PageTransition><SplashScreen /></PageTransition>
        </Route>
        <Route path="/auth">
          <PageTransition><AuthScreen /></PageTransition>
        </Route>
        <Route path="/setup-model">
          <PageTransition><ModelSetupScreen /></PageTransition>
        </Route>
        <Route path="/novels">
          <PageTransition><NovelsScreen /></PageTransition>
        </Route>
        <Route path="/new-novel">
          <PageTransition><NewNovelScreen /></PageTransition>
        </Route>
        <Route path="/mc-setup">
          <PageTransition><MCSetupScreen /></PageTransition>
        </Route>
        <Route path="/story/:novelId">
          <StoryScreen />
        </Route>
        <Route>
          <PageTransition>
            <div className="eden-gradient-bg min-h-dvh flex items-center justify-center">
              <div className="text-center space-y-4">
                <p className="font-display italic text-4xl text-[#e6e6f0]">404</p>
                <p className="text-[#7a7a8c]">This path does not exist in your story.</p>
              </div>
            </div>
          </PageTransition>
        </Route>
      </Switch>
    </AnimatePresence>
  )
}
