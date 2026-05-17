const BEDROCK_BASE_URL = 'https://bedrock-mantle.us-east-1.api.aws/v1';

export interface BedrockModel {
  id: string;
  name: string;
  group: string;
}

// Story generation models — Mistral is excluded (Voxtral is used for TTS only)
export const BEDROCK_MODELS: BedrockModel[] = [
  { id: 'qwen.qwen3-32b-v1:0',            name: 'Qwen3 32B',          group: 'Qwen'       },
  { id: 'qwen.qwen3-coder-30b-a3b-v1:0',  name: 'Qwen3 Coder 30B',   group: 'Qwen'       },
  { id: 'google.gemma-3-4b-it',           name: 'Gemma 3 4B',         group: 'Gemma'      },
  { id: 'google.gemma-3-12b-it',          name: 'Gemma 3 12B',        group: 'Gemma'      },
  { id: 'google.gemma-3-27b-it',          name: 'Gemma 3 27B',        group: 'Gemma'      },
  { id: 'minimax.minimax-m2.1',           name: 'MiniMax M2.1',       group: 'MiniMax'    },
  { id: 'minimax.minimax-m2.5',           name: 'MiniMax M2.5',       group: 'MiniMax'    },
  { id: 'nvidia.nemotron-nano-9b-v2',     name: 'Nemotron Nano 9B',   group: 'NVIDIA'     },
  { id: 'zai.glm-4.7',                   name: 'GLM-4.7',            group: 'GLM'        },
  { id: 'zai.glm-5',                     name: 'GLM-5',              group: 'GLM'        },
  { id: 'openai.gpt-oss-120b',           name: 'GPT OSS 120B',       group: 'OpenAI OSS' },
];

export const BEDROCK_DEFAULT_MODEL = 'qwen.qwen3-32b-v1:0';

/** Mistral Voxtral — used exclusively for TTS. Not a story generation model. */
export const VOXTRAL_TTS_MODEL = 'mistral.voxtral-small-24b-2507';

export const BEDROCK_GROUPS = [...new Set(BEDROCK_MODELS.map(m => m.group))];

function buildMessages(systemPrompt: string, userPrompt: string) {
  const msgs: { role: string; content: string }[] = [];
  if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
  msgs.push({ role: 'user', content: userPrompt });
  return msgs;
}

export async function* bedrockStream(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; temperature?: number } = {}
): AsyncGenerator<string> {
  const { maxTokens = 1000, temperature = 0.7 } = options;

  const res = await fetch(`${BEDROCK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: buildMessages(systemPrompt, userPrompt),
      max_tokens: maxTokens,
      temperature,
      stream: true,
    }),
  });

  if (res.status === 401) throw new Error('Invalid Bedrock API key. Check your ABSK key.');
  if (res.status === 429) throw new Error('Bedrock rate limit reached. Please wait a moment.');
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Bedrock API error ${res.status}: ${body.slice(0, 200)}`);
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
          const data = JSON.parse(jsonStr) as { choices?: { delta?: { content?: string } }[] };
          const content = data.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {}
      }
    }
  }
}

export async function bedrockGenerateText(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const { maxTokens = 400, temperature = 0.7 } = options;

  const res = await fetch(`${BEDROCK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: buildMessages(systemPrompt, userPrompt),
      max_tokens: maxTokens,
      temperature,
      stream: false,
    }),
  });

  if (res.status === 401) throw new Error('Invalid Bedrock API key.');
  if (res.status === 429) throw new Error('Bedrock rate limit. Please wait.');
  if (!res.ok) throw new Error(`Bedrock API error: ${res.status}`);

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content || '';
}

export async function bedrockTestConnection(
  apiKey: string,
  model: string
): Promise<{ success: boolean; error?: string; latencyMs?: number }> {
  const start = Date.now();
  try {
    const text = await bedrockGenerateText(
      apiKey,
      model,
      '',
      'Reply with only the word: OK',
      { maxTokens: 10, temperature: 0 }
    );
    if (!text) throw new Error('Empty response from Bedrock.');
    return { success: true, latencyMs: Date.now() - start };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
