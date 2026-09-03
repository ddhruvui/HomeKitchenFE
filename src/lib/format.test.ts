import { formatQty, qtyUnit, unitsFor } from './format';

describe('formatQty', () => {
  it('prints fractions a cook reads', () => {
    expect(formatQty(0.25)).toBe('¼'); expect(formatQty(1.5)).toBe('1½'); expect(formatQty(2)).toBe('2');
    expect(formatQty(2.75)).toBe('2¾'); expect(formatQty(1 / 3)).toBe('⅓'); expect(formatQty(0.375)).toBe('0.38');
  });
  it('joins unit labels', () => { expect(qtyUnit(1.5, 'floz')).toBe('1½ fl oz'); expect(qtyUnit(2, undefined)).toBe('2'); expect(qtyUnit(undefined, 'cup')).toBe(''); });
});
describe('unitsFor', () => {
  it('fresh ingredients may only use their own count unit', () => {
    const u = unitsFor({ kind: 'fresh', countUnit: 'bunch' });
    expect(u).toContain('bunch'); expect(u).not.toContain('each'); expect(u).toContain('cup'); expect(u).toContain('lb');
    expect(unitsFor({ kind: 'fresh' })).not.toContain('each');
  });
  it('pantry lines may use anything', () => { expect(unitsFor({ kind: 'pantry' })).toContain('each'); expect(unitsFor(undefined)).toContain('bunch'); });
});
