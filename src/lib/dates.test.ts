import { byExpiryThenName, expiryLabel, expiryStatus } from './dates';

describe('expiry', () => {
  const today = '2026-09-03';
  it('judges a date against today', () => {
    expect(expiryStatus('2026-09-01', today)).toEqual({ status: 'expired', days: -2 });
    expect(expiryStatus('2026-10-03', today).status).toBe('soon');
    expect(expiryStatus('2026-10-04', today).status).toBe('later');
  });
  it('says it in words', () => {
    expect(expiryLabel('2026-09-02', today)).toBe('expired yesterday');
    expect(expiryLabel('2026-08-20', today)).toBe('expired 14 days ago');
    expect(expiryLabel('2026-09-03', today)).toBe('expires today');
    expect(expiryLabel('2026-09-15', today)).toBe('expires in 12 days');
    expect(expiryLabel('2026-12-01', today)).toBe('expires 1 Dec');
  });
  it('sorts dated items to the top, soonest first, then the rest by name', () => {
    const rows = [{ name: 'Salt' }, { name: 'Masala', expiresOn: '2026-12-01' }, { name: 'Atta' }, { name: 'Turmeric', expiresOn: '2026-09-15' }];
    expect(rows.slice().sort(byExpiryThenName).map((r) => r.name)).toEqual(['Turmeric', 'Masala', 'Atta', 'Salt']);
  });
});
