export type ModelDefinition = {
  id: string;
  label: string;
  icon: string;
  shortcut: string;
};

export const MODELS: ModelDefinition[] = [
  // OpenRouter models
  { id: 'openrouter:arcee-ai/trinity-large-preview:free', label: 'Trinity Large', icon: '/lithium/arcee.png', shortcut: 'Preview' },
  { id: 'openrouter:stepfun/step-3.5-flash:free', label: 'Step 3.5 Flash', icon: '/lithium/stepfun.png', shortcut: '' },
  { id: 'openrouter:z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air', icon: '/lithium/zai.png', shortcut: '' },
  { id: 'openrouter:deepseek/deepseek-r1-0528:free', label: 'R1', icon: '/lithium/deepseek.png', shortcut: '0528' },
  { id: 'openrouter:nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron 3 Nano', icon: '/lithium/nvidia.png', shortcut: '30B' },

  // Google AI Studio models
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', icon: '/lithium/google.png', shortcut: 'Preview' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', icon: '/lithium/google.png', shortcut: '' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash', icon: '/lithium/google.png', shortcut: 'Lite' },
];

export const ALLOWED_MODEL_IDS = new Set(MODELS.map(m => m.id));
