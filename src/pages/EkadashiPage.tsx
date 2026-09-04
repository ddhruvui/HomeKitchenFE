import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Carry, Plus, X } from '../components/Icons';
import { api, errorMessage } from '../lib/api';
import { addDays, dowLong, isValidDate, longDate, parse, todayStr } from '../lib/dates';
import { keys, useEkadashi, useMarkEkadashi, useUnmarkEkadashi } from '../lib/hooks';
import type { EkadashiDay } from '../lib/types';

/** How many of the next fasts fetch their week to show the dish. A calendar marked a year out is not 24 week requests. */
const NEAR = 4;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthLabel = (d: string) => `${MONTHS[parse(d).getUTCMonth()]} ${parse(d).getUTCFullYear()}`;
/** Runs of dates in the same month, in the order given — the list is already sorted, so one pass. */
function byMonth(days: EkadashiDay[]): Array<{ label: string; days: EkadashiDay[] }> {
  const out: Array<{ label: string; days: EkadashiDay[] }> = [];
  for (const d of days) { const label = monthLabel(d.date); const last = out[out.length - 1]; if (last && last.label === label) last.days.push(d); else out.push({ label, days: [d] }); }
  return out;
}

export function EkadashiPage() {
  const ekadashi = useEkadashi(); const mark = useMarkEkadashi(); const unmark = useUnmarkEkadashi();
  const [draft, setDraft] = useState(todayStr());
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const all = ekadashi.data ?? [];
  const today = todayStr();
  const upcoming = all.filter((d) => d.date >= today);
  const past = all.filter((d) => d.date < today).reverse();

  // Picking an already-marked date loads its name into the box, so re-marking round-trips it and clearing the box clears it.
  function pickDate(date: string) { setDraft(date); setName(all.find((d) => d.date === date)?.name ?? ''); }
  async function add() {
    setError(null);
    if (!isValidDate(draft)) { setError('Pick a date first.'); return; }
    try { await mark.mutateAsync({ date: draft, name: name.trim() }); } catch (e) { setError(errorMessage(e)); }
  }
  async function remove(date: string) { setError(null); try { await unmark.mutateAsync(date); } catch (e) { setError(errorMessage(e)); } }

  return (
    <div className="page">
      <div className="page-head">
        <div className="col" style={{ gap: 4 }}><span className="eyebrow">Fast days</span><h1>Ekadashi</h1></div>
      </div>

      <div className="banner soft" style={{ alignSelf: 'flex-start', maxWidth: 760, alignItems: 'flex-start' }}><span style={{ color: 'var(--accent-ink)', display: 'flex', paddingTop: 1 }}><Carry size={15} /></span>
        One dish on a fast day, eaten at both lunch and dinner — and cooked the evening before, so that night you cook twice. The dinner from that evening carries past the fast to the next day’s lunch. Breakfast is yours to plan as usual.</div>

      <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input className="input mono" type="date" aria-label="date to mark" style={{ width: 172 }} value={draft} onChange={(e) => pickDate(e.target.value)} />
        <input className="input" aria-label="name" placeholder="Name — optional, e.g. Nirjala" style={{ width: 260 }} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" type="submit" disabled={mark.isPending}><Plus size={13} />Mark as Ekadashi</button>
      </form>

      {error && <div className="banner red">{error}</div>}
      {ekadashi.isError && <div className="banner red">{errorMessage(ekadashi.error)}</div>}

      <div className="card" style={{ maxWidth: 760, paddingBottom: 4 }}>
        {ekadashi.isLoading && <div className="empty">Loading…</div>}
        {!ekadashi.isLoading && all.length === 0 && <div className="empty">No days marked yet.</div>}
        {byMonth(upcoming).map((g) => (
          <div key={`up-${g.label}`}>
            <div className="group"><span className="eyebrow" style={{ fontSize: 10 }}>{g.label}</span></div>
            {g.days.map((d) => <FastDay key={d.id} day={d} upcoming showDish={upcoming.indexOf(d) < NEAR} onUnmark={() => remove(d.date)} />)}
          </div>
        ))}
        {past.length > 0 && <div className="group" style={{ borderTop: '1px solid var(--rule-soft)', marginTop: 8 }}><span className="eyebrow" style={{ fontSize: 10 }}>Already passed</span></div>}
        {byMonth(past).map((g) => (
          <div key={`pa-${g.label}`}>
            <div className="group" style={{ paddingTop: 6 }}><span className="eyebrow" style={{ fontSize: 10, color: '#c0b7ab' }}>{g.label}</span></div>
            {g.days.map((d) => <FastDay key={d.id} day={d} upcoming={false} showDish={false} onUnmark={() => remove(d.date)} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function FastDay({ day, upcoming, showDish, onUnmark }: { day: EkadashiDay; upcoming: boolean; showDish: boolean; onUnmark: () => void }) {
  const week = useQuery({ queryKey: keys.week(day.date), queryFn: () => api.plan.week(day.date), enabled: showDish });
  const dishes = week.data?.days.find((d) => d.date === day.date)?.dinner ?? [];
  return (
    <div className={'fastday' + (upcoming ? '' : ' past') + (day.date === todayStr() ? ' today' : '')}>
      <div className="when">{longDate(day.date)}{day.name && <small>{day.name}</small>}</div>
      <div className="what">
        {showDish && (!week.data
          ? <span className="faint">…</span>
          : dishes.length > 0
            ? <span className="serif" style={{ fontSize: 15.5, color: 'var(--ink)' }}>{dishes.map((r) => r.title ?? '?').join(' + ')}</span>
            : <span className="faint serif" style={{ fontStyle: 'italic' }}>No dish planned yet</span>)}
        {/* A fast day's pot is always cooked the evening before (§4), so the previous day names itself. */}
        {upcoming && <small>cooked {dowLong(addDays(day.date, -1))} evening · <Link to={`/plan?date=${day.date}`}>{dishes.length > 0 ? 'see the plan' : 'plan it'}</Link></small>}
      </div>
      <button aria-label={`unmark ${day.date}`} style={{ color: '#c0b7ab' }} onClick={onUnmark}><X size={12} /></button>
    </div>
  );
}
