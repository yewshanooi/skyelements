export type ModelDefinition = {
  id: string;
  label: string;
  icon: string;
  shortcut: string;
};

export const MODELS: ModelDefinition[] = [
  // Google AI Studio models
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash', icon: '/lithium/google.png', shortcut: 'Lite' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', icon: '/lithium/google.png', shortcut: '' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', icon: '/lithium/google.png', shortcut: 'Preview' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', icon: '/lithium/google.png', shortcut: '' },

  // OpenRouter models
  { id: 'openrouter:nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super', icon: '/lithium/nvidia.png', shortcut: '120B' },
  { id: 'openrouter:poolside/laguna-m.1:free', label: 'Laguna M.1', icon: '/lithium/poolside.png', shortcut: '' },
  { id: 'openrouter:poolside/laguna-xs.2:free', label: 'Laguna XS.2', icon: '/lithium/poolside.png', shortcut: '' },
  { id: 'openrouter:z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air', icon: '/lithium/zai.png', shortcut: '' },
];

export const ALLOWED_MODEL_IDS = new Set(MODELS.map(m => m.id));
