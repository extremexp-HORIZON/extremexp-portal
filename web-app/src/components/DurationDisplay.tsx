/**
 * Format duration in a compact readable format (e.g., 1d12h30m45s)
 */
function formatDuration(diffMs: number): string {
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join('');
}

/**
 * Humanize a duration into a readable string
 */
function humanizeDuration(diffMs: number): string {
  const diffSec = Math.floor(diffMs / 1000);

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
      return `${count} ${unit}`;
    }
  }

  if (diffSec >= 1) {
    return diffSec === 1 ? '1 second' : `${diffSec} seconds`;
  }

  return 'less than a second';
}

interface DurationDisplayProps {
  /** ISO date string or Date object for the start time */
  start: string | Date | undefined;
  /** ISO date string or Date object for the end time. If undefined, duration is ongoing */
  end?: string | Date | undefined;
  /** Fallback text when start is undefined */
  fallback?: string;
}

/**
 * Displays a duration in ISO 8601 format with a humanized duration below.
 * If end is not provided, uses current time and shows "for X" to indicate ongoing.
 */
export default function DurationDisplay({ start, end, fallback = '—' }: DurationDisplayProps) {
  if (!start) {
    return <span className="text-xs text-neutral-500">{fallback}</span>;
  }

  let startDate: Date;
  let endDate: Date;
  const isOngoing = !end;
  let isValid = true;

  try {
    startDate = typeof start === 'string' ? new Date(start) : start;
    if (isNaN(startDate.getTime())) {
      isValid = false;
    } else if (end) {
      endDate = typeof end === 'string' ? new Date(end) : end;
      if (isNaN(endDate.getTime())) {
        isValid = false;
      }
    } else {
      endDate = new Date();
    }
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return <span className="text-xs text-neutral-500">{fallback}</span>;
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) {
    return <span className="text-xs text-neutral-500">{fallback}</span>;
  }

  const duration = formatDuration(diffMs);
  const humanized = humanizeDuration(diffMs);

  return (
    <div className="flex flex-col leading-tight">
      <span className="text-xs font-mono">{duration}</span>
      <span className="text-[10px] text-neutral-500">
        {isOngoing ? `for ${humanized}` : humanized}
      </span>
    </div>
  );
}
