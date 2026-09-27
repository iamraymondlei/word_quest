export interface LrcLine {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

const TIMESTAMP_RE = /\[(\d{1,3}):(\d{2})(?:\.(\d{1,3})|:(\d{1,3}))?\]/g;

function parseTimestamp(minutes: string, seconds: string, fraction?: string, millis?: string): number {
  const decimal = fraction !== undefined
    ? Number(`0.${fraction.padEnd(3, '0')}`)
    : Number(millis || 0) / 1000;
  return Number(minutes) * 60 + Number(seconds) + decimal;
}

/** Parse line-based LRC into sentence intervals. Metadata and blank lines are ignored. */
export function parseLrc(lrc: string, audioDuration?: number): LrcLine[] {
  if (typeof lrc !== 'string') return [];
  const entries: Array<{ startTime: number; text: string }> = [];

  for (const rawLine of lrc.split(/\r?\n/)) {
    const timestamps = Array.from(rawLine.matchAll(TIMESTAMP_RE));
    if (timestamps.length === 0) continue;
    const text = rawLine.replace(TIMESTAMP_RE, '').trim();
    if (!text) continue;

    for (const match of timestamps) {
      const startTime = parseTimestamp(match[1], match[2], match[3], match[4]);
      if (Number.isFinite(startTime) && startTime >= 0) entries.push({ startTime, text });
    }
  }

  entries.sort((a, b) => a.startTime - b.startTime);
  return entries.map((entry, index) => {
    const nextStart = entries[index + 1]?.startTime;
    const endTime = nextStart !== undefined
      ? nextStart
      : (Number.isFinite(audioDuration) && (audioDuration as number) > entry.startTime
        ? audioDuration as number
        : entry.startTime + 6);
    return { id: index + 1, startTime: entry.startTime, endTime, text: entry.text };
  });
}

export function formatLrcTime(seconds: number): string {
  const safeSeconds = Math.round(Math.max(0, seconds) * 100) / 100;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = (safeSeconds - minutes * 60).toFixed(2).padStart(5, '0');
  return `[${String(minutes).padStart(2, '0')}:${remainder}]`;
}

export function serializeLrc(lines: LrcLine[]): string {
  return lines.map((line) => `${formatLrcTime(line.startTime)}${line.text}`).join('\n');
}
