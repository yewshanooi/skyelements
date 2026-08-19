/**
 * Date formatting, flexible parsing, and calendar grid utilities for Notion-style date pickers.
 */

const MONTHS_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const DAYS_OF_WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * Checks if a given year, month (1-12), and day are a valid calendar date.
 */
export function isValidDateParts(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;

  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
}

/**
 * Formats year, month (1-12), day into standard ISO format: YYYY-MM-DD.
 */
export function formatIsoParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Formats a Date object to YYYY-MM-DD.
 */
export function formatIsoDate(d: Date): string {
  if (isNaN(d.getTime())) return '';
  return formatIsoParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Formats YYYY-MM-DD into DD/MM/YYYY for input display.
 */
export function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  const parts = trimmed.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }

  return dateStr;
}

/**
 * Formats YYYY-MM-DD into friendly short string like "18 Aug 2026" or "18 Aug".
 */
export function formatDateShort(dateStr?: string, includeYear = true): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (m >= 1 && m <= 12) {
      const monthName = MONTH_NAMES_SHORT[m - 1];
      return includeYear ? `${d} ${monthName} ${y}` : `${d} ${monthName}`;
    }
  }
  return dateStr;
}

/**
 * Robustly parses a user-entered date string into YYYY-MM-DD format.
 */
export function parseDateString(raw?: string): string | null {
  if (!raw) return null;
  const input = raw.trim().toLowerCase();
  if (!input) return null;
  const currentYear = new Date().getFullYear();

  // 1. YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = input.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (isValidDateParts(y, m, d)) {
      return formatIsoParts(y, m, d);
    }
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY or DD/MM/YY
  const dmyMatch = input.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})$/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    let y = parseInt(dmyMatch[3], 10);

    if (y < 100) {
      y = y < 50 ? 2000 + y : 1900 + y;
    }

    if (isValidDateParts(y, p2, p1)) {
      return formatIsoParts(y, p2, p1);
    }
    if (isValidDateParts(y, p1, p2)) {
      return formatIsoParts(y, p1, p2);
    }
  }

  // 3. DD/MM or DD-MM (current year)
  const dmMatch = input.match(/^(\d{1,2})[-/. ](\d{1,2})$/);
  if (dmMatch) {
    const p1 = parseInt(dmMatch[1], 10);
    const p2 = parseInt(dmMatch[2], 10);
    if (isValidDateParts(currentYear, p2, p1)) {
      return formatIsoParts(currentYear, p2, p1);
    }
    if (isValidDateParts(currentYear, p1, p2)) {
      return formatIsoParts(currentYear, p1, p2);
    }
  }

  // 4. Month names: e.g. "18 Aug 2026"
  const dayMonthYearMatch = input.match(
    /^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:[,\s]+(\d{2,4}))?$/
  );
  if (dayMonthYearMatch) {
    const d = parseInt(dayMonthYearMatch[1], 10);
    const mStr = dayMonthYearMatch[2];
    let y = dayMonthYearMatch[3] ? parseInt(dayMonthYearMatch[3], 10) : currentYear;
    if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;
    const m = MONTHS_MAP[mStr];
    if (m && isValidDateParts(y, m, d)) {
      return formatIsoParts(y, m, d);
    }
  }

  // 5. Month names: e.g. "Aug 18, 2026"
  const monthDayYearMatch = input.match(
    /^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:[,\s]+(\d{2,4}))?$/
  );
  if (monthDayYearMatch) {
    const mStr = monthDayYearMatch[1];
    const d = parseInt(monthDayYearMatch[2], 10);
    let y = monthDayYearMatch[3] ? parseInt(monthDayYearMatch[3], 10) : currentYear;
    if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;
    const m = MONTHS_MAP[mStr];
    if (m && isValidDateParts(y, m, d)) {
      return formatIsoParts(y, m, d);
    }
  }

  // 6. 8-digit compact: 18082026 or 20260818
  if (/^\d{8}$/.test(input)) {
    const y1 = parseInt(input.slice(0, 4), 10);
    const m1 = parseInt(input.slice(4, 6), 10);
    const d1 = parseInt(input.slice(6, 8), 10);
    if (y1 >= 1900 && y1 <= 2100 && isValidDateParts(y1, m1, d1)) {
      return formatIsoParts(y1, m1, d1);
    }
    const d2 = parseInt(input.slice(0, 2), 10);
    const m2 = parseInt(input.slice(2, 4), 10);
    const y2 = parseInt(input.slice(4, 8), 10);
    if (isValidDateParts(y2, m2, d2)) {
      return formatIsoParts(y2, m2, d2);
    }
  }

  const parsedNative = new Date(input);
  if (!isNaN(parsedNative.getTime())) {
    const y = parsedNative.getFullYear();
    const m = parsedNative.getMonth() + 1;
    const d = parsedNative.getDate();
    if (isValidDateParts(y, m, d)) {
      return formatIsoParts(y, m, d);
    }
  }

  return null;
}

export interface CalendarGridCell {
  dayNumber: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Computes calendar cells for a Monday-first 7-column month grid (35 or 42 cells).
 */
export function generateCalendarGrid(year: number, month: number): CalendarGridCell[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0

  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: CalendarGridCell[] = [];
  const today = new Date();
  const todayStr = formatIsoDate(today);

  // 1. Previous month trailing days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthIdx = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = formatIsoParts(prevYear, prevMonthIdx + 1, dayNum);
    cells.push({
      dayNumber: dayNum,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // 2. Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = formatIsoParts(year, month + 1, d);
    cells.push({
      dayNumber: d,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // 3. Next month leading days
  const totalCells = cells.length > 35 ? 42 : 35;
  const remaining = totalCells - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonthIdx = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = formatIsoParts(nextYear, nextMonthIdx + 1, d);
    cells.push({
      dayNumber: d,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  return cells;
}
