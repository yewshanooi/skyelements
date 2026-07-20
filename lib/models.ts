export type ThinkingEffort = 'auto' | 'minimal' | 'low' | 'medium' | 'high';

export const THINKING_EFFORT_PREFERENCE_KEY = 'lithium-thinking-effort';

export function isThinkingEffort(value: unknown): value is ThinkingEffort {
  return value === 'auto' || value === 'minimal' || value === 'low' || value === 'medium' || value === 'high';
}

export type ThinkingOption = {
  value: ThinkingEffort;
  label: string;
};

/**
 * Describes how a model exposes reasoning controls. Keep this metadata next to
 * the model list so the client and server cannot drift apart as models change.
 */
export type ThinkingSupport = {
  kind: 'level';
  levels: readonly Exclude<ThinkingEffort, 'auto'>[];
  defaultEffort: ThinkingEffort;
};

export type ModelDefinition = {
  id: string;
  label: string;
  icon: string;
  shortcut: string;
  thinking: ThinkingSupport;
};

const GEMINI_3_THINKING: ThinkingSupport = {
  kind: 'level',
  levels: ['minimal', 'low', 'medium', 'high'],
  // Auto intentionally delegates to the selected model's documented default.
  defaultEffort: 'auto',
};

export const MODELS: ModelDefinition[] = [
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash', icon: '/lithium/google.svg', shortcut: 'Lite', thinking: GEMINI_3_THINKING },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', icon: '/lithium/google.svg', shortcut: '', thinking: GEMINI_3_THINKING },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', icon: '/lithium/google.svg', shortcut: 'Preview', thinking: GEMINI_3_THINKING },
];

export const ALLOWED_MODEL_IDS = new Set(MODELS.map(m => m.id));

export function getModelDefinition(model: string): ModelDefinition | undefined {
  return MODELS.find(candidate => candidate.id === model);
}

export function getThinkingSupport(model: string): ThinkingSupport | undefined {
  return getModelDefinition(model)?.thinking;
}

/** Return only the thinking controls supported by the selected model. */
export function getThinkingOptions(model?: string): ThinkingOption[] {
  const support = model ? getThinkingSupport(model) : GEMINI_3_THINKING;
  if (!support || support.kind !== 'level') return [];

  return [
    { value: 'auto', label: 'Auto' },
    ...support.levels.map(value => ({
      value,
      label: value[0].toUpperCase() + value.slice(1),
    })),
  ];
}

/** Normalize untrusted client input before it reaches the model API. */
export function normalizeThinkingEffort(model: string, effort: unknown): ThinkingEffort {
  const support = getThinkingSupport(model);
  if (!support || !isThinkingEffort(effort)) return 'auto';
  if (effort === 'auto') return support.defaultEffort;
  return support.levels.includes(effort) ? effort : support.defaultEffort;
}
