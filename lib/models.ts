export type ThinkingEffort = 'auto' | 'minimal' | 'low' | 'medium' | 'high';

export const THINKING_EFFORT_PREFERENCE_KEY = 'lithium-thinking-effort';

export function isThinkingEffort(value: unknown): value is ThinkingEffort {
  return value === 'auto' || value === 'minimal' || value === 'low' || value === 'medium' || value === 'high';
}

export type ThinkingOption = {
  value: ThinkingEffort;
  label: string;
};

type ThinkingLevel = Exclude<ThinkingEffort, 'auto'>;

export type ModelDefinition = {
  id: string;
  label: string;
  icon: string;
  shortcut: string;
  thinking?: readonly ThinkingLevel[];
};

const GEMINI_THINKING_LEVELS: readonly ThinkingLevel[] = ['minimal', 'low', 'medium', 'high'];

export const MODELS: ModelDefinition[] = [
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash', icon: '/lithium/google.svg', shortcut: 'Lite', thinking: GEMINI_THINKING_LEVELS },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', icon: '/lithium/google.svg', shortcut: '', thinking: GEMINI_THINKING_LEVELS },
];

export const ALLOWED_MODEL_IDS = new Set(MODELS.map(m => m.id));

export function getModelDefinition(model: string): ModelDefinition | undefined {
  return MODELS.find(candidate => candidate.id === model);
}

/** Return only the thinking controls supported by the selected model. */
export function getThinkingOptions(model?: string): ThinkingOption[] {
  const levels = model ? getModelDefinition(model)?.thinking : GEMINI_THINKING_LEVELS;
  if (!levels) return [];

  return [
    { value: 'auto', label: 'Auto' },
    ...levels.map(value => ({
      value,
      label: value[0].toUpperCase() + value.slice(1),
    })),
  ];
}

/** Normalize untrusted client input before it reaches the model API. */
export function normalizeThinkingEffort(model: string, effort: unknown): ThinkingEffort {
  const levels = getModelDefinition(model)?.thinking;
  if (!levels || !isThinkingEffort(effort) || effort === 'auto') return 'auto';

  return levels.includes(effort) ? effort : 'auto';
}
