import { bedrockStream, bedrockGenerateText, bedrockTestConnection, BEDROCK_DEFAULT_MODEL } from './bedrockService';

const HF_BASE_URL = 'https://router.huggingface.co/v1';
const GROK_BASE_URL = 'https://api.x.ai/v1';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const CLAUDE_BASE_URL = 'https://api.anthropic.com/v1';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

const GROK_MODEL = 'grok-3-fast';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_FALLBACK = 'gemini-1.5-flash';
const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_FALLBACK = 'gpt-4o';
const CLAUDE_MODEL = 'claude-3-5-haiku-20241022';
const DEEPSEEK_MODEL = 'deepseek-chat';

export type AIProvider = 'huggingface' | 'grok' | 'gemini' | 'openai' | 'claude' | 'deepseek' | 'nova' | 'bedrock';
export type ModelListener = () => void;

const PROVIDER_KEY_MAP: Record<string, string> = {
  grok:        'grok_api_key',
  gemini:      'gemini_api_key',
  openai:      'openai_api_key',
  claude:      'claude_api_key',
  deepseek:    'deepseek_api_key',
  nova:        'bedrock_api_key',
  bedrock:     'bedrock_api_key',
};

// Static env fallback values — each property access is a literal string so Vite's
// define block (which does static text replacement) actually substitutes the value.
// A dynamic lookup like (import.meta.env)[key] is NOT replaced by define.
const ENV_FALLBACK_VALUES: Record<string, string> = {
  grok:        import.meta.env.VITE_GROK_API_KEY     || '',
  gemini:      import.meta.env.VITE_GEMINI_API_KEY   || '',
  openai:      import.meta.env.VITE_OPENAI_API_KEY   || '',
  claude:      import.meta.env.VITE_CLAUDE_API_KEY   || '',
  deepseek:    import.meta.env.VITE_DEEPSEEK_API_KEY || '',
  nova:        import.meta.env.VITE_BEDROCK_API_KEY  || '',
  bedrock:     import.meta.env.VITE_BEDROCK_API_KEY  || '',
  huggingface: import.meta.env.VITE_HF_TOKEN         || '',
};

function getEnvFallback(provider: string): string {
  return ENV_FALLBACK_VALUES[provider] || '';
}

class ModelService {
  hfToken: string;
  selectedModel: string;
  isConnected: boolean;
  isStreaming: boolean;
  availableModels: Record<string, unknown>[];
  connectionError: string;
  private listeners: ModelListener[];

  constructor() {
    this.hfToken = localStorage.getItem('hf_token') || getEnvFallback('huggingface');
    this.selectedModel = localStorage.getItem('selected_model') || '';
    this.isConnected = false;
    this.isStreaming = false;
    this.availableModels = [];
    this.connectionError = '';
    this.listeners = [];
  }

  getProvider(): AIProvider {
    return (localStorage.getItem('ai_provider') as AIProvider) || 'huggingface';
  }

  isProviderSelected(): boolean {
    return localStorage.getItem('ai_provider') !== null;
  }

  getApiKey(provider?: AIProvider): string {
    const p = provider ?? this.getProvider();
    const storageKey = PROVIDER_KEY_MAP[p];
    if (!storageKey) return '';
    const stored = localStorage.getItem(storageKey) || '';
    if (stored) return stored;
    return getEnvFallback(p);
  }

  saveApiKey(provider: AIProvider, key: string) {
    const storageKey = PROVIDER_KEY_MAP[provider];
    if (storageKey) {
      localStorage.setItem(storageKey, key.trim());
      // Only mark connected if a real key was provided; env-fallback path
      // leaves isConnected false until testConnection() is called explicitly.
      const effectiveKey = key.trim() || getEnvFallback(provider);
      this.isConnected = !!effectiveKey;
      this.connectionError = effectiveKey ? '' : 'No key set — using env fallback or unconfigured.';
      this.notifyListeners();
    }
  }

  isProviderReady(): boolean {
    const p = this.getProvider();
    if (p === 'huggingface') return !!this.hfToken && !!this.selectedModel;
    return !!this.getApiKey(p);
  }

  setProvider(p: AIProvider) {
    localStorage.setItem('ai_provider', p);
    if (p === 'grok') {
      this.selectedModel = GROK_MODEL;
      localStorage.setItem('selected_model', GROK_MODEL);
      this.isConnected = true;
      this.connectionError = '';
    } else if (p === 'gemini') {
      this.selectedModel = GEMINI_MODEL;
      localStorage.setItem('selected_model', GEMINI_MODEL);
      this.isConnected = !!this.getApiKey('gemini');
    } else if (p === 'openai') {
      this.selectedModel = OPENAI_MODEL;
      localStorage.setItem('selected_model', OPENAI_MODEL);
      this.isConnected = !!this.getApiKey('openai');
    } else if (p === 'claude') {
      this.selectedModel = CLAUDE_MODEL;
      localStorage.setItem('selected_model', CLAUDE_MODEL);
      this.isConnected = !!this.getApiKey('claude');
    } else if (p === 'deepseek') {
      this.selectedModel = DEEPSEEK_MODEL;
      localStorage.setItem('selected_model', DEEPSEEK_MODEL);
      this.isConnected = !!this.getApiKey('deepseek');
    } else if (p === 'bedrock') {
      const saved = localStorage.getItem('bedrock_model') || BEDROCK_DEFAULT_MODEL;
      this.selectedModel = saved;
      localStorage.setItem('selected_model', saved);
      this.isConnected = !!this.getApiKey('bedrock');
    } else if (p === 'nova') {
      this.selectedModel = localStorage.getItem('bedrock_model') || BEDROCK_DEFAULT_MODEL;
      localStorage.setItem('selected_model', this.selectedModel);
      this.isConnected = !!this.getApiKey('nova');
    }
    this.notifyListeners();
  }

  selectBedrockModel(modelId: string) {
    this.selectedModel = modelId;
    localStorage.setItem('selected_model', modelId);
    localStorage.setItem('bedrock_model', modelId);
    this.notifyListeners();
  }

  clearProvider() {
    localStorage.removeItem('ai_provider');
    this.isConnected = false;
    this.notifyListeners();
  }

  saveToken(token: string) {
    this.hfToken = token.trim();
    localStorage.setItem('hf_token', this.hfToken);
    this.notifyListeners();
  }

  selectModel(modelId: string) {
    this.selectedModel = modelId;
    localStorage.setItem('selected_model', modelId);
    this.notifyListeners();
  }

  addListener(fn: ModelListener) { this.listeners.push(fn); }
  removeListener(fn: ModelListener) { this.listeners = this.listeners.filter(l => l !== fn); }
  notifyListeners() { this.listeners.forEach(fn => fn()); }

  async testConnection(): Promise<{ success: boolean; error?: string; models?: Record<string, unknown>[] }> {
    const p = this.getProvider();

    if (p === 'bedrock' || p === 'nova') {
      const key = this.getApiKey(p);
      if (!key) {
        this.isConnected = false;
        this.connectionError = 'No Bedrock API key set.';
        this.notifyListeners();
        return { success: false, error: 'No Bedrock API key set.' };
      }
      const model = this.selectedModel || BEDROCK_DEFAULT_MODEL;
      const result = await bedrockTestConnection(key, model);
      this.isConnected = result.success;
      this.connectionError = result.error || '';
      this.notifyListeners();
      return {
        success: result.success,
        error: result.error,
      };
    }

    if (p === 'grok' || p === 'gemini' || p === 'openai' || p === 'claude' || p === 'deepseek') {
      const key = this.getApiKey(p);
      if (p !== 'grok' && !key) {
        this.isConnected = false;
        this.connectionError = 'No API key set.';
        this.notifyListeners();
        return { success: false, error: 'No API key set.' };
      }
      try {
        if (p === 'claude') {
          const res = await fetch(`${CLAUDE_BASE_URL}/messages`, {
            method: 'POST',
            headers: {
              'x-api-key': key,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: CLAUDE_MODEL,
              max_tokens: 1,
              messages: [{ role: 'user', content: 'Hi' }],
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (res.ok || res.status === 529) {
            this.isConnected = true; this.connectionError = ''; this.notifyListeners();
            return { success: true };
          }
          const text = await res.text().catch(() => '');
          let errMsg = `HTTP ${res.status}`;
          try { const j = JSON.parse(text); if (j.error?.message) errMsg = `${res.status}: ${j.error.message}`; } catch {}
          this.isConnected = false; this.connectionError = errMsg; this.notifyListeners();
          return { success: false, error: errMsg };
        }
        // OpenAI-compatible providers
        const [baseUrl, model] =
          p === 'grok'     ? [GROK_BASE_URL,     GROK_MODEL]     :
          p === 'gemini'   ? [GEMINI_BASE_URL,   GEMINI_MODEL]   :
          p === 'openai'   ? [OPENAI_BASE_URL,   OPENAI_MODEL]   :
                             [DEEPSEEK_BASE_URL, DEEPSEEK_MODEL];
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1,
            stream: false,
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) {
          this.isConnected = true; this.connectionError = ''; this.notifyListeners();
          return { success: true };
        }
        const text = await res.text().catch(() => '');
        let errMsg = `HTTP ${res.status}`;
        try { const j = JSON.parse(text); if (j.error?.message) errMsg = `${res.status}: ${j.error.message}`; } catch {}
        this.isConnected = false; this.connectionError = errMsg; this.notifyListeners();
        return { success: false, error: errMsg };
      } catch (e) {
        const msg = `Cannot reach ${p}: ${(e as Error).message}`;
        this.isConnected = false; this.connectionError = msg; this.notifyListeners();
        return { success: false, error: msg };
      }
    }

    if (!this.hfToken) {
      this.isConnected = false;
      this.connectionError = 'No token set.';
      this.notifyListeners();
      return { success: false, error: 'No token set.' };
    }
    try {
      const res = await fetch(`${HF_BASE_URL}/models`, {
        headers: { Authorization: `Bearer ${this.hfToken}` },
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = await res.json() as { data?: Record<string, unknown>[] };
        this.availableModels = data.data || [];
        this.isConnected = true;
        this.connectionError = '';
        this.notifyListeners();
        return { success: true, models: this.availableModels };
      } else if (res.status === 401) {
        this.isConnected = false;
        this.connectionError = 'Invalid token. Check your HuggingFace token.';
        this.notifyListeners();
        return { success: false, error: 'Invalid token. Check your HuggingFace token.' };
      }
      this.isConnected = false;
      this.connectionError = `HTTP ${res.status}`;
      this.notifyListeners();
      return { success: false, error: `HTTP ${res.status}` };
    } catch (e) {
      this.isConnected = false;
      this.connectionError = `Cannot reach HuggingFace: ${(e as Error).message}`;
      this.notifyListeners();
      return { success: false, error: `Cannot reach HuggingFace: ${(e as Error).message}` };
    }
  }

  async fetchAvailableModels(): Promise<Record<string, unknown>[]> {
    if (this.getProvider() === 'grok') return [];
    if (!this.hfToken) return [];
    try {
      const res = await fetch(`${HF_BASE_URL}/models`, {
        headers: { Authorization: `Bearer ${this.hfToken}` },
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = await res.json() as { data?: Record<string, unknown>[] };
        this.availableModels = data.data || [];
        this.notifyListeners();
        return this.availableModels;
      }
    } catch {}
    return [];
  }

  private async *_openAICompatStream(
    baseUrl: string,
    model: string,
    apiKey: string,
    systemPrompt: string,
    userPrompt: string,
    options: { maxTokens?: number; temperature?: number },
    extraHeaders?: Record<string, string>
  ): AsyncGenerator<string> {
    const { maxTokens = 1000, temperature = 0.7 } = options;
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
        stream: true,
      }),
    });
    if (res.status === 401) throw new Error('Invalid API key. Check your settings.');
    if (res.status === 429) throw new Error('Rate limit reached. Please wait a moment.');
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`API error ${res.status}: ${body.slice(0, 200)}`);
    }
    yield* this._readSSEStream(res);
  }

  private async *_claudeStream(
    systemPrompt: string,
    userPrompt: string,
    options: { maxTokens?: number; temperature?: number }
  ): AsyncGenerator<string> {
    const { maxTokens = 1000, temperature = 0.7 } = options;
    const apiKey = this.getApiKey('claude');
    if (!apiKey) throw new Error('No Claude API key set.');

    const res = await fetch(`${CLAUDE_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        stream: true,
      }),
    });

    if (res.status === 401) throw new Error('Invalid Claude API key. Check your settings.');
    if (res.status === 429) throw new Error('Claude rate limit reached. Please wait.');
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Claude API error ${res.status}: ${body.slice(0, 200)}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const data = JSON.parse(jsonStr) as {
              type?: string;
              delta?: { type?: string; text?: string };
            };
            if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta' && data.delta.text) {
              yield data.delta.text;
            }
          } catch {}
        }
      }
    }
  }

  private async *_hfStream(
    systemPrompt: string,
    userPrompt: string,
    options: { maxTokens?: number; temperature?: number }
  ): AsyncGenerator<string> {
    const { maxTokens = 600, temperature = 0.7 } = options;
    if (!this.hfToken) throw new Error('No HF token set.');
    if (!this.selectedModel) throw new Error('No model selected.');
    yield* this._openAICompatStream(HF_BASE_URL, this.selectedModel, this.hfToken, systemPrompt, userPrompt, { maxTokens, temperature });
  }

  private async *_grokStream(
    systemPrompt: string,
    userPrompt: string,
    options: { maxTokens?: number; temperature?: number }
  ): AsyncGenerator<string> {
    const apiKey = this.getApiKey('grok');
    if (!apiKey) throw new Error('No Grok API key set. Please enter your xAI API key in Settings.');
    yield* this._openAICompatStream(GROK_BASE_URL, GROK_MODEL, apiKey, systemPrompt, userPrompt, options);
  }

  private async *_geminiStream(
    systemPrompt: string,
    userPrompt: string,
    options: { maxTokens?: number; temperature?: number }
  ): AsyncGenerator<string> {
    const apiKey = this.getApiKey('gemini');
    if (!apiKey) throw new Error('No Gemini API key set.');
    try {
      yield* this._openAICompatStream(GEMINI_BASE_URL, GEMINI_MODEL, apiKey, systemPrompt, userPrompt, options);
    } catch (e) {
      if ((e as Error).message.includes('404') || (e as Error).message.includes('not found')) {
        yield* this._openAICompatStream(GEMINI_BASE_URL, GEMINI_FALLBACK, apiKey, systemPrompt, userPrompt, options);
      } else {
        throw e;
      }
    }
  }

  private async *_openAIStream(
    systemPrompt: string,
    userPrompt: string,
    options: { maxTokens?: number; temperature?: number }
  ): AsyncGenerator<string> {
    const apiKey = this.getApiKey('openai');
    if (!apiKey) throw new Error('No OpenAI API key set.');
    try {
      yield* this._openAICompatStream(OPENAI_BASE_URL, OPENAI_MODEL, apiKey, systemPrompt, userPrompt, options);
    } catch (e) {
      if ((e as Error).message.includes('404') || (e as Error).message.includes('not found')) {
        yield* this._openAICompatStream(OPENAI_BASE_URL, OPENAI_FALLBACK, apiKey, systemPrompt, userPrompt, options);
      } else {
        throw e;
      }
    }
  }

  private async *_deepseekStream(
    systemPrompt: string,
    userPrompt: string,
    options: { maxTokens?: number; temperature?: number }
  ): AsyncGenerator<string> {
    const apiKey = this.getApiKey('deepseek');
    if (!apiKey) throw new Error('No DeepSeek API key set.');
    yield* this._openAICompatStream(DEEPSEEK_BASE_URL, DEEPSEEK_MODEL, apiKey, systemPrompt, userPrompt, options);
  }

  private async *_readSSEStream(res: Response): AsyncGenerator<string> {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const data = JSON.parse(jsonStr) as { choices?: { delta?: { content?: string } }[] };
            const content = data.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {}
        }
      }
    }
  }

  async *generateStream(
    systemPrompt: string,
    userPrompt: string,
    options: { maxTokens?: number; temperature?: number } = {}
  ): AsyncGenerator<string> {
    this.isStreaming = true;
    try {
      const p = this.getProvider();
      if (p === 'bedrock' || p === 'nova') {
        const key = this.getApiKey(p);
        if (!key) throw new Error('No Bedrock API key set. Enter your ABSK key in Settings.');
        const model = this.selectedModel || BEDROCK_DEFAULT_MODEL;
        yield* bedrockStream(key, model, systemPrompt, userPrompt, options);
      } else if (p === 'grok')     yield* this._grokStream(systemPrompt, userPrompt, options);
      else if (p === 'gemini')     yield* this._geminiStream(systemPrompt, userPrompt, options);
      else if (p === 'openai')     yield* this._openAIStream(systemPrompt, userPrompt, options);
      else if (p === 'claude')     yield* this._claudeStream(systemPrompt, userPrompt, options);
      else if (p === 'deepseek')   yield* this._deepseekStream(systemPrompt, userPrompt, options);
      else                         yield* this._hfStream(systemPrompt, userPrompt, options);
    } finally {
      this.isStreaming = false;
    }
  }

  async generateText(
    systemPrompt: string,
    userPrompt: string,
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<string> {
    const { maxTokens = 400, temperature = 0.7 } = options;
    const p = this.getProvider();

    if (p === 'bedrock' || p === 'nova') {
      const key = this.getApiKey(p);
      if (!key) throw new Error('No Bedrock API key set.');
      const model = this.selectedModel || BEDROCK_DEFAULT_MODEL;
      return bedrockGenerateText(key, model, systemPrompt, userPrompt, { maxTokens, temperature });
    }

    if (p === 'claude') {
      const apiKey = this.getApiKey('claude');
      if (!apiKey) throw new Error('No Claude API key set.');
      const res = await fetch(`${CLAUDE_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          stream: false,
        }),
      });
      if (!res.ok) throw new Error(`Claude error: ${res.status}`);
      const data = await res.json() as { content?: { type: string; text: string }[] };
      return data.content?.find(b => b.type === 'text')?.text || '';
    }

    const [baseUrl, model, apiKey] = (() => {
      if (p === 'grok')     return [GROK_BASE_URL,     GROK_MODEL,     this.getApiKey('grok')];
      if (p === 'gemini')   return [GEMINI_BASE_URL,   GEMINI_MODEL,   this.getApiKey('gemini')];
      if (p === 'openai')   return [OPENAI_BASE_URL,   OPENAI_MODEL,   this.getApiKey('openai')];
      if (p === 'deepseek') return [DEEPSEEK_BASE_URL, DEEPSEEK_MODEL, this.getApiKey('deepseek')];
      return [HF_BASE_URL, this.selectedModel, this.hfToken];
    })();

    if (!apiKey) throw new Error(`No API key for ${p}.`);
    if (!model) throw new Error('No model selected.');

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
        stream: false,
      }),
    });

    if (res.status === 401) throw new Error('Invalid API key.');
    if (res.status === 429) throw new Error('Rate limit. Please wait.');
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content || '';
  }
}

export const modelService = new ModelService();
