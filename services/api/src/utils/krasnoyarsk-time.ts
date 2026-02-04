const KRASNOYARSK_OFFSET_MINUTES = 7 * 60;
const KRASNOYARSK_OFFSET_MS = KRASNOYARSK_OFFSET_MINUTES * 60 * 1000;

function hasTimezoneSuffix(value: string): boolean {
  // Accepts e.g. 2026-01-01T10:00Z or 2026-01-01T10:00+07:00 or +0700
  return /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
}

/**
 * Parse a datetime-local value (no timezone) as Asia/Krasnoyarsk (+07:00)
 * and return a JS Date representing the correct UTC instant.
 *
 * If input already contains a timezone suffix, it is parsed as-is.
 */
export function parseKrasnoyarskDateTime(value: string | Date): Date {
  if (value instanceof Date) return value;
  const raw = String(value).trim();
  if (!raw) return new Date(NaN);

  if (hasTimezoneSuffix(raw)) return new Date(raw);

  // Normalize to seconds to avoid inconsistent parsing.
  const withSeconds = raw.length === 16 ? `${raw}:00` : raw;
  return new Date(`${withSeconds}+07:00`);
}

/**
 * Convert an arbitrary Date into "start of day" in Krasnoyarsk, returned as UTC instant.
 */
export function startOfDayKrasnoyarsk(date: Date): Date {
  const shifted = new Date(date.getTime() + KRASNOYARSK_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return new Date(Date.UTC(y, m, d) - KRASNOYARSK_OFFSET_MS);
}

export function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function buildKrasnoyarskDateTimeForDay(dayUtcStart: Date, hhmm: string): Date {
  const [hStr, mStr] = hhmm.split(':');
  const hours = Number(hStr);
  const minutes = Number(mStr);

  const shifted = new Date(dayUtcStart.getTime() + KRASNOYARSK_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();

  return new Date(Date.UTC(y, m, d, hours, minutes, 0, 0) - KRASNOYARSK_OFFSET_MS);
}

export function getKrasnoyarskDayOfWeek(dayUtcStart: Date): number {
  // 0=Sun..6=Sat in Krasnoyarsk time
  const shifted = new Date(dayUtcStart.getTime() + KRASNOYARSK_OFFSET_MS);
  return shifted.getUTCDay();
}

