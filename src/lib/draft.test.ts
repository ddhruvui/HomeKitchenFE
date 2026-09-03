import { ingredientInputFor, linesFromDraft, undecided } from './draft';
import type { DraftLine } from './types';

const potato: DraftLine = { name: 'Potatoes', qty: 2, unit: 'cup', note: 'boiled', kind: 'fresh', form: 'Produce', match: { ingredientId: 'pot', name: 'Potato', kind: 'fresh', confidence: 'exact' } };
const lemon: DraftLine = { name: 'Lemon', qty: 1, unit: 'each', kind: 'fresh', form: 'Produce', match: null };
const salt: DraftLine = { name: 'Salt', qty: 1, rawUnit: 'pinch', kind: 'pantry', match: null };
const chili: DraftLine = { name: 'Green Chili', qty: 2, unit: 'each', kind: 'pantry', form: 'Spices', match: null };

describe('turning a draft into editor lines', () => {
  it('a fresh item counted in each is bought by each; one measured in cups is bought by the pound until a bridge exists', () => {
    expect(ingredientInputFor(lemon, 's1')).toEqual({ name: 'Lemon', kind: 'fresh', storeId: 's1', form: 'Produce', buyUnit: 'each', stockUnit: 'each', countUnit: 'each' });
    expect(ingredientInputFor({ ...lemon, unit: 'cup' }, 's1')).toMatchObject({ buyUnit: 'lb', stockUnit: 'lb' });
  });
  it('pantry and weekly get sensible defaults and no units', () => {
    expect(ingredientInputFor(salt, 's2')).toEqual({ name: 'Salt', kind: 'pantry', storeId: 's2', form: 'Dry Goods' });
    expect(ingredientInputFor({ ...salt, kind: 'weekly', form: undefined }, 's2')).toMatchObject({ kind: 'weekly', weeklyQty: 1, form: 'Dairy' });
  });
  it('matched lines keep the catalog id, created lines get the new id, skipped and undecided lines are dropped', () => {
    const lines = linesFromDraft([potato, lemon, salt, chili], { 1: 'lem-new' }, { 2: { skip: true } });
    expect(lines).toEqual([
      { ingredientId: 'pot', qty: '2', unit: 'cup', note: 'boiled' },
      { ingredientId: 'lem-new', qty: '1', unit: 'each', note: '' },
    ]);
  });
  it('an unreadable unit survives as a note so nothing is silently lost', () => {
    expect(linesFromDraft([salt], { 0: 'salt-new' }, {})[0]).toMatchObject({ qty: '1', unit: '', note: '(1 pinch)' });
  });
  it('undecided lists the unmatched lines still waiting for a store', () => {
    expect(undecided([potato, lemon, salt, chili], { 1: { storeId: 's1' }, 2: { skip: true } })).toEqual([3]);
  });
});
