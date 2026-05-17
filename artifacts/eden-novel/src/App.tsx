import React, { useEffect } from 'react';
import { Switch, Route, useLocation, Router as WouterRouter } from 'wouter';
import { AppProvider } from './context/AppContext';
import { ModelProvider, useModel } from './context/ModelContext';
import { StoryProvider } from './context/StoryContext';
import { ProgressionProvider } from './context/ProgressionContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProviderSelectionScreen from './screens/ProviderSelectionScreen';
import ApiKeySetupScreen from './screens/ApiKeySetupScreen';
import HFTokenScreen from './screens/HFTokenScreen';
import ModelSelectionScreen from './screens/ModelSelectionScreen';
import NovelSelectionScreen from './screens/NovelSelectionScreen';
import GenrePickerScreen from './screens/GenrePickerScreen';
import StoryScreen from './screens/StoryScreen';
import SettingsScreen from './screens/SettingsScreen';
import ChapterHistoryScreen from './screens/ChapterHistoryScreen';
import TimelineBranchScreen from './screens/TimelineBranchScreen';
import LoginScreen from './screens/LoginScreen';

const API_KEY_PROVIDERS = new Set(['gemini', 'openai', 'claude', 'deepseek', 'nova', 'bedrock', 'grok']);

function GuardedRoutes() {
  const [location, navigate] = useLocation();
  const { hfToken, selectedModel, provider, providerSelected, isProviderReady } = useModel();

  useEffect(() => {
    if (!providerSelected) {
      if (location !== '/provider-select') navigate('/provider-select');
      return;
    }

    if (provider === 'grok') {
      if (
        location === '/provider-select' ||
        location === '/token-setup' ||
        location === '/model-selection' ||
        location === '/api-key-setup' ||
        location === '/'
      ) {
        navigate('/novels');
      }
      return;
    }

    if (API_KEY_PROVIDERS.has(provider)) {
      if (!isProviderReady) {
        if (location !== '/api-key-setup' && location !== '/provider-select') {
          navigate('/api-key-setup');
        }
        return;
      }
      if (location === '/provider-select' || location === '/') {
        navigate('/novels');
      }
      return;
    }

    // HuggingFace flow
    if (!hfToken && location !== '/token-setup' && location !== '/provider-select') {
      navigate('/token-setup');
    } else if (
      hfToken &&
      !selectedModel &&
      location !== '/model-selection' &&
      location !== '/token-setup' &&
      location !== '/provider-select'
    ) {
      navigate('/model-selection');
    }
  }, [hfToken, selectedModel, location, provider, providerSelected, isProviderReady]);

  return (
    <Switch>
      <Route path="/provider-select" component={ProviderSelectionScreen} />
      <Route path="/api-key-setup" component={ApiKeySetupScreen} />
      <Route path="/token-setup" component={HFTokenScreen} />
      <Route path="/model-selection" component={ModelSelectionScreen} />
      <Route path="/novels" component={NovelSelectionScreen} />
      <Route path="/genre-picker" component={GenrePickerScreen} />
      <Route path="/story/:novelId" component={StoryScreen} />
      <Route path="/settings" component={SettingsScreen} />
      <Route path="/chapters/:novelId" component={ChapterHistoryScreen} />
      <Route path="/timeline/:novelId" component={TimelineBranchScreen} />
      <Route path="/" component={NovelSelectionScreen} />
    </Switch>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { authReady, user, isGuest } = useAuth();

  if (!authReady) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#04040d]">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user && !isGuest) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ModelProvider>
          <StoryProvider>
            <ProgressionProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
                <AuthGate>
                  <GuardedRoutes />
                </AuthGate>
              </WouterRouter>
            </ProgressionProvider>
          </StoryProvider>
        </ModelProvider>
      </AppProvider>
    </AuthProvider>
  );
}
