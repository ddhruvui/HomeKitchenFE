const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function parse(s: string): Date { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
export function todayStr(): string { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; }
export function isValidDate(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return parse(s).toISOString().slice(0, 10) === s;
}
export function addDays(s: string, n: number): string { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export function dow(s: string): string { return DOW[parse(s).getUTCDay()]; }
export function dowLong(s: string): string { return DOW_LONG[parse(s).getUTCDay()]; }
export function dayNum(s: string): number { return parse(s).getUTCDate(); }
export function shortDate(s: string): string { const d = parse(s); return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; }
export function longDate(s: string): string { const d = parse(s); return `${DOW_LONG[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; }
export function rangeLabel(start: string, end: string): string { return `${shortDate(start)} – ${shortDate(end)}`; }
export function relativeWeek(start: string, thisStart: string): string {
  const diff = Math.round((parse(start).getTime() - parse(thisStart).getTime()) / 86400000 / 7);
  if (diff === 0) return 'This week'; if (diff === 1) return 'Next week'; if (diff === -1) return 'Last week';
  return diff > 0 ? `In ${diff} weeks` : `${-diff} weeks ago`;
}
export function daysBetween(from: string, to: string): number { return Math.round((parse(to).getTime() - parse(from).getTime()) / 86400000); }
export type ExpiryStatus = 'expired' | 'soon' | 'later';
/** Mirror of the backend's expiryStatus: past, within thirty days, or fine. */
export function expiryStatus(expiresOn: string, today = todayStr()): { status: ExpiryStatus; days: number } {
  const days = daysBetween(today, expiresOn);
  return { status: days < 0 ? 'expired' : days <= 30 ? 'soon' : 'later', days };
}
export function expiryLabel(expiresOn: string, today = todayStr()): string {
  const { status, days } = expiryStatus(expiresOn, today);
  if (status === 'expired') return days === -1 ? 'expired yesterday' : `expired ${-days} days ago`;
  if (days === 0) return 'expires today';
  if (status === 'soon') return `expires in ${days} day${days === 1 ? '' : 's'}`;
  return `expires ${shortDate(expiresOn).slice(4)}`;
}
/** Dated items first, soonest first; then everything else by name. */
export function byExpiryThenName<T extends { name: string; expiresOn?: string }>(a: T, b: T): number {
  if (a.expiresOn && b.expiresOn) return a.expiresOn.localeCompare(b.expiresOn) || a.name.localeCompare(b.name);
  if (a.expiresOn) return -1;
  if (b.expiresOn) return 1;
  return a.name.localeCompare(b.name);
}
export function relativeDay(date: string): string {
  const diff = Math.round((parse(date).getTime() - parse(todayStr()).getTime()) / 86400000);
  if (diff === 0) return 'Today'; if (diff === 1) return 'Tomorrow'; if (diff === -1) return 'Yesterday';
  return dowLong(date);
}
