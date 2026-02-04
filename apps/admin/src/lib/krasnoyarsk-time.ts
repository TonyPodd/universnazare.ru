const KRASNOYARSK_TZ = 'Asia/Krasnoyarsk';
const KRASNOYARSK_OFFSET = '+07:00';

function hasTimezoneSuffix(value: string): boolean {
  return /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
}

export function formatDateTimeLocalKrasnoyarsk(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  // "sv-SE" reliably formats as "YYYY-MM-DD HH:mm" in 24h time.
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    timeZone: KRASNOYARSK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return formatted.replace(' ', 'T');
}

/**
 * Convert a datetime-local string (no TZ) to an ISO-8601 string with +07:00 offset.
 * This avoids relying on the browser's local timezone and passes backend IsDateString validation.
 */
export function toKrasnoyarskOffsetDateTime(value: string): string {
  const raw = String(value).trim();
  if (!raw) return '';
  if (hasTimezoneSuffix(raw)) return raw;

  const withSeconds = raw.length === 16 ? `${raw}:00` : raw;
  return `${withSeconds}${KRASNOYARSK_OFFSET}`;
}
