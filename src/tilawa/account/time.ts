export const ACCOUNT_ZONES = [
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Africa/Cairo',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Sydney',
];

export const formatAccountDate = (iso: string, zone: string, locale: string): string =>
  new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: zone,
  }).format(new Date(iso));

export const localDateTime = (iso: string, zone: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const value = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
};

/** Reject nonexistent AND ambiguous DST wall times rather than silently shifting a booking.
 * @returns {string | null} the unambiguous UTC appointment
 */
export const wallTimeToUtc = (wall: string, zone: string): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wall)) return null;
  const approximate = Date.parse(`${wall}Z`);
  if (!Number.isFinite(approximate)) return null;
  const matches: string[] = [];
  for (let minutes = -14 * 60; minutes <= 14 * 60; minutes += 15) {
    const candidate = new Date(approximate + minutes * 60000).toISOString();
    if (localDateTime(candidate, zone) === wall) matches.push(candidate);
  }
  return matches.length === 1 ? matches[0] : null;
};
