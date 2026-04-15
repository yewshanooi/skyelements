export type ModelDefinition = {
  id: string;
  label: string;
  icon: string;
  shortcut: string;
};

export const MODELS: ModelDefinition[] = [
  // Google AI Studio models
  { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash', icon: '/lithium/google.png', shortcut: 'Lite' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', icon: '/lithium/google.png', shortcut: '' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', icon: '/lithium/google.png', shortcut: '' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash', icon: '/lithium/google.png', shortcut: 'Lite' },

  // OpenRouter models
  { id: 'openrouter:nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super', icon: '/lithium/nvidia.png', shortcut: '120B' },
  { id: 'openrouter:nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron 3 Nano', icon: '/lithium/nvidia.png', shortcut: '30B' },
  { id: 'openrouter:z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air', icon: '/lithium/zai.png', shortcut: '' },
  { id: 'openrouter:openai/gpt-oss-120b:free', label: 'gpt-oss', icon: '/lithium/openai.png', shortcut: '120B' },
];

export const ALLOWED_MODEL_IDS = new Set(MODELS.map(m => m.id));
