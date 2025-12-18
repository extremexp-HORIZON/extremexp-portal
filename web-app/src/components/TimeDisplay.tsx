/**
 * Format a date as RFC 3339 in local time (e.g., 2025-12-17T14:30:00)
 */
function formatRFC3339Local(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Humanize a time difference into a readable string
 */
function humanizeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(Math.abs(diffMs) / 1000);
  const isFuture = diffMs < 0;

  const intervals: [number, string, string][] = [
    [31536000, 'year', 'years'],
    [2592000, 'month', 'months'],
    [604800, 'week', 'weeks'],
    [86400, 'day', 'days'],
    [3600, 'hour', 'hours'],
    [60, 'minute', 'minutes'],
  ];

  for (const [seconds, singular, plural] of intervals) {
    const count = Math.floor(diffSec / seconds);
    if (count >= 1) {
      const unit = count === 1 ? singular : plural;
      return isFuture ? `in ${count} ${unit}` : `${count} ${unit} ago`;
    }
  }

  return isFuture ? 'in a few seconds' : 'just now';
}

interface TimeDisplayProps {
  /** ISO date string or Date object */
  time: string | Date | undefined;
  /** Fallback text when time is undefined */
  fallback?: string;
}

/**
 * Displays a timestamp in RFC 3339 format (local time) with a humanized relative time below.
 */
export default function TimeDisplay({ time, fallback = '—' }: TimeDisplayProps) {
  if (!time) {
    return <span className="text-xs text-neutral-500">{fallback}</span>;
  }

  let date: Date;
  let isValid = true;

  try {
    date = typeof time === 'string' ? new Date(time) : time;
    if (isNaN(date.getTime())) {
      isValid = false;
    }
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return <span className="text-xs text-neutral-500">{fallback}</span>;
  }

  const rfc3339 = formatRFC3339Local(date);
  const humanized = humanizeTime(date);

  return (
    <div className="flex flex-col leading-tight">
      <span className="text-xs font-mono">{rfc3339}</span>
      <span className="text-[10px] text-neutral-500">{humanized}</span>
    </div>
  );
}
