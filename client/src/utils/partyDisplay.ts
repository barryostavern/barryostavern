export function richNoteHasText(value?: string): boolean {
  if (!value) return false;
  return value.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
}

export function formatPartyTime(value?: string): string | null {
  if (!value) return null;

  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = match[2];
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minute} ${period}`;
}

export function formatPartyTimeRange(start?: string, end?: string): string | null {
  const startLabel = formatPartyTime(start);
  const endLabel = formatPartyTime(end);

  if (startLabel && endLabel) return `${startLabel} – ${endLabel}`;
  if (startLabel) return `Starts at ${startLabel}`;
  if (endLabel) return `Ends at ${endLabel}`;
  return null;
}
