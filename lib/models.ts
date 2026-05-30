export type ModelDefinition = {
  id: string;
  label: string;
  icon: string;
  shortcut: string;
};

export const MODELS: ModelDefinition[] = [
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash', icon: '/lithium/google.svg', shortcut: 'Lite' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', icon: '/lithium/google.svg', shortcut: '' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', icon: '/lithium/google.svg', shortcut: 'Preview' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash', icon: '/lithium/google.svg', shortcut: 'Lite' },
];

export const ALLOWED_MODEL_IDS = new Set(MODELS.map(m => m.id));
