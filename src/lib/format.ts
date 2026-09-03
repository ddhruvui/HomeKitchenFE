// Mirror of the display helpers in HomeKitchenBE/shared/src/units.ts. No arithmetic beyond formatting.
import type { CountUnit, Unit } from './types';

export const WEIGHT_UNITS: Unit[] = ['oz', 'lb'];
export const VOLUME_UNITS: Unit[] = ['tsp', 'tbsp', 'floz', 'cup', 'pint', 'quart', 'gallon'];
export const COUNT_UNITS: CountUnit[] = ['each', 'bunch'];
export const UNIT_LABEL: Record<Unit, string> = { oz: 'oz', lb: 'lb', tsp: 'tsp', tbsp: 'tbsp', floz: 'fl oz', cup: 'cup', pint: 'pint', quart: 'qt', gallon: 'gal', each: 'each', bunch: 'bunch' };

export function familyOf(u: Unit): 'weight' | 'volume' | 'count' {
  if (WEIGHT_UNITS.includes(u)) return 'weight';
  if (VOLUME_UNITS.includes(u)) return 'volume';
  return 'count';
}

/** 0.25 → "¼", 1.5 → "1½", 2 → "2", 0.38 → "0.38". */
export function formatQty(v: number): string {
  const w = Math.floor(v + 1e-9);
  const f = v - w;
  const near = (x: number) => Math.abs(f - x) < 0.02;
  let fr = '';
  if (near(0.25)) fr = '¼'; else if (near(0.5)) fr = '½'; else if (near(0.75)) fr = '¾';
  else if (near(1 / 3)) fr = '⅓'; else if (near(2 / 3)) fr = '⅔';
  if (fr) return (w > 0 ? String(w) : '') + fr;
  return String(Math.round(v * 100) / 100);
}
export function qtyUnit(qty: number | undefined, unit: Unit | undefined): string {
  if (qty === undefined) return '';
  return unit ? `${formatQty(qty)} ${UNIT_LABEL[unit]}` : formatQty(qty);
}
/** Units a recipe line may use for this ingredient: weight, volume, and only its own count unit. */
export function unitsFor(ing: { kind: string; countUnit?: CountUnit } | undefined): Unit[] {
  if (!ing || ing.kind !== 'fresh') return [...WEIGHT_UNITS, ...VOLUME_UNITS, ...COUNT_UNITS];
  return [...WEIGHT_UNITS, ...VOLUME_UNITS, ...(ing.countUnit ? [ing.countUnit] : [])];
}
