// Turning an AI recipe draft into editor lines. Pure, so it is tested without the network or React.
import type { IngredientInput } from './api';
import { COUNT_UNITS, familyOf } from './format';
import type { CountUnit, DraftLine, Unit } from './types';

export type LineDraft = { ingredientId: string; qty: string; unit: Unit | ''; note: string };
export type Decision = { storeId?: string; skip?: boolean };

/** What to create for an unmatched line once the user has picked a store. Kind and aisle come from the model's suggestion, with safe defaults. */
export function ingredientInputFor(line: DraftLine, storeId: string): IngredientInput {
  const kind = line.kind ?? 'pantry';
  const form = line.form ?? (kind === 'fresh' ? 'Produce' : kind === 'weekly' ? 'Dairy' : 'Dry Goods');
  const out: IngredientInput = { name: line.name, kind, storeId, form };
  if (kind === 'weekly') out.weeklyQty = 1;
  if (kind === 'fresh') {
    const u = line.unit;
    if (u && familyOf(u) === 'count') { out.buyUnit = u; out.stockUnit = u; out.countUnit = u as CountUnit; }
    else { out.buyUnit = 'lb'; out.stockUnit = 'lb'; }           // volume-measured produce: bought by weight, bridge estimated later
    if (!out.countUnit && u && COUNT_UNITS.includes(u as CountUnit)) out.countUnit = u as CountUnit;
  }
  return out;
}

/** Editor lines from a draft: matched lines use the catalog id, created ones the new id, skipped/undecided ones are dropped. */
export function linesFromDraft(lines: DraftLine[], created: Record<number, string>, decisions: Record<number, Decision>): LineDraft[] {
  const out: LineDraft[] = [];
  lines.forEach((l, i) => {
    const id = l.match?.ingredientId ?? created[i];
    if (!id || decisions[i]?.skip) return;
    out.push({ ingredientId: id, qty: l.qty !== undefined ? String(l.qty) : '', unit: l.unit ?? '', note: l.note ?? (l.rawUnit ? `(${l.qty ?? ''} ${l.rawUnit})`.trim() : '') });
  });
  return out;
}
/** Lines that still need a store before the draft can be used. */
export function undecided(lines: DraftLine[], decisions: Record<number, Decision>): number[] {
  return lines.map((l, i) => (!l.match && !decisions[i]?.skip && !decisions[i]?.storeId ? i : -1)).filter((i) => i >= 0);
}
