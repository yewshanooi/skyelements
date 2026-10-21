/**
 * Shared (server + client safe) definitions for the Sales Dashboard option columns.
 * Do NOT add "use client" / "use server" here.
 */

export const OPTION_TYPES = [
  'category',
  'marketplace',
  'order_status',
  'payment_status',
  'payment_method',
] as const;

export type OptionType = (typeof OPTION_TYPES)[number];

export const OPTION_TYPE_LABELS: Record<OptionType, string> = {
  category: 'Category',
  marketplace: 'Store',
  order_status: 'Order Status',
  payment_status: 'Payment Status',
  payment_method: 'Payment Method',
};

export const MAX_OPTION_NAME_LENGTH = 100;

export const NOTION_COLORS = [
  { id: 'default', label: 'Default', tagClass: 'tag-default', colorHex: '#e3e2e0' },
  { id: 'gray', label: 'Gray', tagClass: 'tag-gray', colorHex: '#9b9a97' },
  { id: 'brown', label: 'Brown', tagClass: 'tag-brown', colorHex: '#d9730d' },
  { id: 'orange', label: 'Orange', tagClass: 'tag-orange', colorHex: '#ff9b57' },
  { id: 'yellow', label: 'Yellow', tagClass: 'tag-yellow', colorHex: '#e3b341' },
  { id: 'green', label: 'Green', tagClass: 'tag-green', colorHex: '#4dab75' },
  { id: 'blue', label: 'Blue', tagClass: 'tag-blue', colorHex: '#529cca' },
  { id: 'purple', label: 'Purple', tagClass: 'tag-purple', colorHex: '#9a6dd7' },
  { id: 'pink', label: 'Pink', tagClass: 'tag-pink', colorHex: '#e255a1' },
  { id: 'red', label: 'Red', tagClass: 'tag-red', colorHex: '#ff7369' },
] as const;

export const DEFAULT_OPTION_COLOR = 'tag-default';

const VALID_COLOR_CLASSES: ReadonlySet<string> = new Set(NOTION_COLORS.map((c) => c.tagClass));

export function isValidOptionColor(color: unknown): color is string {
  return typeof color === 'string' && VALID_COLOR_CLASSES.has(color);
}

/**
 * Solid hex for a tag class, for charts/PDF where the pale tag styling isn't suitable.
 * The "default" tag is near-white, so charts use neutral gray for it instead.
 */
export function getTagColorHex(tagClass: string | undefined): string {
  if (!tagClass || tagClass === DEFAULT_OPTION_COLOR) return '#9b9a97';
  return NOTION_COLORS.find((c) => c.tagClass === tagClass)?.colorHex ?? '#9b9a97';
}

export function isOptionType(value: unknown): value is OptionType {
  return typeof value === 'string' && (OPTION_TYPES as readonly string[]).includes(value);
}

/** A persisted dropdown option (row in `sales_options`). */
export interface SalesOption {
  id: string;
  type: OptionType;
  name: string;
  color: string;
}
