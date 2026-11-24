export const DEFAULT_ADVANCE_PRICE_CENTS = 1500;
export const MIN_ADVANCE_PRICE_CENTS = 100;
export const MAX_ADVANCE_PRICE_CENTS = 50000;
export const MAX_TICKETS_PER_ORDER = 10;

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
