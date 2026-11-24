export const DEFAULT_ADVANCE_PRICE_CENTS = 1500;
export const MIN_ADVANCE_PRICE_CENTS = 100;
export const MAX_ADVANCE_PRICE_CENTS = 50000;
export const MAX_TICKETS_PER_ORDER = 10;
export const DEFAULT_PARTY_START_TIME = '19:00';
export const DEFAULT_PARTY_END_TIME = '23:30';

const PARTY_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function getPartyTime(value: unknown, fallback: string): string {
  return typeof value === 'string' && PARTY_TIME.test(value) ? value : fallback;
}

export function getAdvancePriceCents(value: unknown): number {
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_ADVANCE_PRICE_CENTS &&
    value <= MAX_ADVANCE_PRICE_CENTS
  ) {
    return value;
  }

  return DEFAULT_ADVANCE_PRICE_CENTS;
}
