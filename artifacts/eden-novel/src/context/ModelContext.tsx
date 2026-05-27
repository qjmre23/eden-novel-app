import React, { createContext, useContext, useEffect, useState } from 'react';
import { modelService, type AIProvider } from '../services/modelService';

interface ModelContextValue {
  hfToken: string;
  selectedModel: string;
  isConnected: boolean;
  connectionError: string;
  availableModels: Record<string, unknown>[];
  provider: AIProvider;
  providerSelected: boolean;
  isProviderReady: boolean;
  saveToken: (token: string) => void;
  saveApiKey: (provider: AIProvider, key: string) => void;
  selectModel: (modelId: string) => void;
  setProvider: (p: AIProvider) => void;
  clearProvider: () => void;
  testConnection: () => Promise<{ success: boolean; error?: string }>;
  fetchModels: () => Promise<void>;
}

const ModelContext = createContext<ModelContextValue | null>(null);

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({
    hfToken: modelService.hfToken,
    selectedModel: modelService.selectedModel,
    isConnected: modelService.isConnected,
    connectionError: modelService.connectionError,
    availableModels: modelService.availableModels,
    provider: modelService.getProvider(),
    providerSelected: modelService.isProviderSelected(),
    isProviderReady: modelService.isProviderReady(),
  });

  useEffect(() => {
    const update = () => setState({
      hfToken: modelService.hfToken,
      selectedModel: modelService.selectedModel,
      isConnected: modelService.isConnected,
      connectionError: modelService.connectionError,
      availableModels: modelService.availableModels,
      provider: modelService.getProvider(),
      providerSelected: modelService.isProviderSelected(),
      isProviderReady: modelService.isProviderReady(),
    });
    modelService.addListener(update);
    return () => modelService.removeListener(update);
  }, []);

  const saveToken = (token: string) => modelService.saveToken(token);
  const saveApiKey = (provider: AIProvider, key: string) => modelService.saveApiKey(provider, key);
  const selectModel = (modelId: string) => modelService.selectModel(modelId);
  const setProvider = (p: AIProvider) => modelService.setProvider(p);
  const clearProvider = () => modelService.clearProvider();
  const testConnection = () => modelService.testConnection();
  const fetchModels = async () => { await modelService.fetchAvailableModels(); };

  return (
    <ModelContext.Provider value={{ ...state, saveToken, saveApiKey, selectModel, setProvider, clearProvider, testConnection, fetchModels }}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error('useModel must be used within ModelProvider');
  return ctx;
}
