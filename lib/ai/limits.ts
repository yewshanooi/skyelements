export const AI_DAILY_REQUEST_LIMITS = {
  'gemini-3.5-flash-lite': {
    label: 'Gemini 3.5 Flash Lite',
    user: 50,
  },
  'gemini-3.6-flash': {
    label: 'Gemini 3.6 Flash',
    user: 5,
  },
  'gemini-3.8-flash': {
    label: 'Gemini 3.8 Flash',
    user: 5,
  },
} as const;

export type AiModelId = keyof typeof AI_DAILY_REQUEST_LIMITS;

export type AiDailyUsage = Partial<Record<AiModelId, {
  userCount: number;
}>>;

export const AI_USAGE_UPDATED_EVENT = 'skye-usage-updated';
