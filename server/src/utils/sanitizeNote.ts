const MAX_NOTE_LENGTH = 4000;
const ALLOWED_TAG = /<\/?(strong|em|p|br)\s*\/?>/gi;

export function sanitizeNote(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  const withoutAllowed = input.replace(ALLOWED_TAG, '');
  if (/[<>]/.test(withoutAllowed)) {
    throw new Error('Event details include formatting that is not allowed');
  }

  const normalized = input
    .trim()
    .replace(/<(\/?)(strong|em|p|br)\s*\/?>/gi, (_match, slash: string, tag: string) => {
      return `<${slash}${tag.toLowerCase()}>`;
    });

  if (normalized.length > MAX_NOTE_LENGTH) {
    throw new Error('Event details are too long');
  }

  return normalized;
}
