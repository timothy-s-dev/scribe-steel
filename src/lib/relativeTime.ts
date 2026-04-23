const formatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
  style: 'long',
});

const UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: 'year', seconds: 60 * 60 * 24 * 365 },
  { unit: 'month', seconds: 60 * 60 * 24 * 30 },
  { unit: 'week', seconds: 60 * 60 * 24 * 7 },
  { unit: 'day', seconds: 60 * 60 * 24 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 },
];

export function formatRelativeTime(iso: string | undefined, now: Date = new Date()): string {
  if (!iso) return 'unknown';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return iso;

  const deltaSeconds = (then.getTime() - now.getTime()) / 1000;
  const absSeconds = Math.abs(deltaSeconds);

  const match = UNITS.find(({ seconds }) => absSeconds >= seconds) ?? UNITS[UNITS.length - 1];
  const value = Math.round(deltaSeconds / match.seconds);
  return formatter.format(value, match.unit);
}
