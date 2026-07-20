export type ThinkingEffort = 'auto' | 'minimal' | 'low' | 'medium' | 'high';

export const THINKING_EFFORT_PREFERENCE_KEY = 'lithium-thinking-effort';

export function isThinkingEffort(value: unknown): value is ThinkingEffort {
  return value === 'auto' || value === 'minimal' || value === 'low' || value === 'medium' || value === 'high';
}

export type ModelDefinition = {
  id: string;
  label: string;
  icon: string;
  shortcut: string;
};

export type ThinkingOption = {
  value: ThinkingEffort;
  label: string;
};

export const MODELS: ModelDefinition[] = [
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash', icon: '/lithium/google.svg', shortcut: 'Lite' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', icon: '/lithium/google.svg', shortcut: '' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', icon: '/lithium/google.svg', shortcut: 'Preview' },
];

export const ALLOWED_MODEL_IDS = new Set(MODELS.map(m => m.id));

/** Return the thinking controls supported by Gemini 3.x models. */
export function getThinkingOptions(): ThinkingOption[] {
  return [
    { value: 'auto', label: 'Auto' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];
}
