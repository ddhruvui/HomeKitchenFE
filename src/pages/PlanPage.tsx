import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FlowStrip } from '../components/FlowStrip';
import { Modal } from '../components/Modal';
import { Carry, Check, Copy, Left, Plus, Right, Warn, X } from '../components/Icons';
import { api, errorMessage } from '../lib/api';
import { addDays, dayNum, dow, longDate, rangeLabel, relativeWeek, todayStr } from '../lib/dates';
import { keys, useDateParam, useIngredients, useNeedsBridge, useRecipes, useSettings, useWeek } from '../lib/hooks';
import { byExpiryThenName, expiryLabel, expiryStatus } from '../lib/dates';
import type { WeekDay } from '../lib/types';

type Slot = 'breakfast' | 'dinner';

export function PlanPage() {
  const [date, setDate] = useDateParam();
  const week = useWeek(date); const recipes = useRecipes(); const settings = useSettings(); const needs = useNeedsBridge(); const ings = useIngredients();
  const useUp = (ings.data ?? []).filter((i) => i.expiresOn && expiryStatus(i.expiresOn).status !== 'later').sort(byExpiryThenName).slice(0, 3)
    .map((i) => ({ ...i, in: (recipes.data ?? []).filter((r) => r.ingredients.some((l) => l.ingredientId === i.id)).map((r) => r.title) }));
  const thisWeek = useWeek(todayStr());
  const prevWeek = useWeek(week.data ? addDays(week.data.startDate, -7) : date);
  const qc = useQueryClient();
  const [picker, setPicker] = useState<{ day: WeekDay; slot: Slot } | null>(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const w = week.data;
  const people = settings.data?.people ?? 2;
  const invalidate = () => qc.invalidateQueries({ queryKey: ['week'] });

  async function setSlot(day: WeekDay, slot: Slot, ids: string[]) {
    setError(null);
    try { await api.plan.setDay(day.date, { breakfast: slot === 'breakfast' ? ids : day.breakfast.map((r) => r.id), dinner: slot === 'dinner' ? ids : day.dinner.map((r) => r.id) }); invalidate(); }
    catch (e) { setError(errorMessage(e)); }
  }
  async function copyLast() {
    if (!w) return;
    try { await api.plan.copy(addDays(w.startDate, -7), w.startDate); invalidate(); } catch (e) { setError(errorMessage(e)); }
  }
  const weekEmpty = !!w && w.days.every((d) => d.breakfast.length === 0 && d.dinner.length === 0);
  const prevHas = !!prevWeek.data && prevWeek.data.days.some((d) => d.breakfast.length + d.dinner.length > 0);
  const options = useMemo(() => (recipes.data ?? []).filter((r) => r.title.toLowerCase().includes(filter.toLowerCase())), [recipes.data, filter]);
  const current = picker ? picker.day[picker.slot].map((r) => r.id) : [];

  return (
    <>
      <FlowStrip current={1} date={date} />
      <div className="page">
        <div className="page-head">
          <div className="col" style={{ gap: 4 }}>
            <span className={'eyebrow' + (w && thisWeek.data && w.startDate === thisWeek.data.startDate ? ' accent' : '')}>{w && thisWeek.data ? relativeWeek(w.startDate, thisWeek.data.startDate) : '…'}</span>
            <h1>{w ? rangeLabel(w.startDate, w.endDate) : 'Loading week'}</h1>
          </div>
          <div className="row" style={{ gap: 6 }}>
            {weekEmpty && prevHas && <button className="btn warn" onClick={copyLast}><Copy size={14} />Copy last week</button>}
            <button className="btn icon" aria-label="previous week" onClick={() => w && setDate(addDays(w.startDate, -7))}><Left size={15} /></button>
            <button className="btn" onClick={() => setDate(todayStr())}>Today</button>
            <button className="btn icon" aria-label="next week" onClick={() => w && setDate(addDays(w.startDate, 7))}><Right size={15} /></button>
            <Link className="btn primary" to={`/fridge?date=${date}`} style={{ marginLeft: 10 }}>Check the kitchen <Right size={14} /></Link>
          </div>
        </div>

        <div className="banner soft" style={{ alignSelf: 'flex-start' }}><span style={{ color: 'var(--accent-ink)', display: 'flex' }}><Carry size={15} /></span>
          Dinner is cooked twice over — that evening and the next day’s lunch. Lunch fills itself in. Quantities are scaled for <b style={{ margin: '0 4px' }}>{people} people</b>.</div>
        {useUp.length > 0 && <div className="banner soft" style={{ alignSelf: 'flex-start', gap: 14 }}><span className="eyebrow accent" style={{ fontSize: 10.5 }}>Use it up</span>{useUp.map((i) => <span key={i.id}><b style={{ fontWeight: 600 }}>{i.name}</b> <span style={{ color: expiryStatus(i.expiresOn!).status === 'expired' ? 'var(--red)' : 'var(--amber)' }}>{expiryLabel(i.expiresOn!)}</span>{i.in.length > 0 && <span className="faint"> · used in {i.in.join(', ')}</span>}</span>)}</div>}
        {error && <div className="banner red">{error}</div>}

        {w && (
          <div className="week">
            <div />
            {w.days.map((d) => <div key={d.date} className={'dayhead' + (d.date === todayStr() ? ' today' : '')}><span className="d">{dow(d.date).toUpperCase()}</span><span className="n">{dayNum(d.date)}</span></div>)}
            <div className="lbl"><span className="eyebrow">Breakfast</span></div>
            {w.days.map((d) => <SlotCell key={d.date} day={d} slot="breakfast" onOpen={() => { setFilter(''); setPicker({ day: d, slot: 'breakfast' }); }} onRemove={(id) => setSlot(d, 'breakfast', d.breakfast.map((r) => r.id).filter((x) => x !== id))} />)}
            <div className="lbl"><span className="eyebrow" style={{ color: '#c0b7ab' }}>Lunch</span><small className="serif" style={{ fontStyle: 'italic', color: '#c0b7ab', fontSize: 10.5 }}>carried over</small></div>
            {w.days.map((d, i) => <div key={d.date} className="slot lunch"><span className="t">{d.lunch.length ? d.lunch.map((r) => r.title).join(' + ') : 'Nothing carried over'}</span>{d.lunch.length > 0 && <small>from {i === 0 ? 'last ' + dow(addDays(d.date, -1)) : dow(addDays(d.date, -1))} dinner</small>}</div>)}
            <div className="lbl"><span className="eyebrow">Dinner</span><span className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent-ink)' }}>×2</span></div>
            {w.days.map((d) => <SlotCell key={d.date} day={d} slot="dinner" onOpen={() => { setFilter(''); setPicker({ day: d, slot: 'dinner' }); }} onRemove={(id) => setSlot(d, 'dinner', d.dinner.map((r) => r.id).filter((x) => x !== id))} />)}
          </div>
        )}

        {needs.data && needs.data.length > 0 && (
          <div className="banner amber"><span style={{ color: 'var(--amber)', display: 'flex' }}><Warn size={18} /></span>
            <span>{needs.data.map((n) => n.ingredient.name).join(' and ')} {needs.data.length === 1 ? 'is' : 'are'} used in a unit that can’t be converted yet. Quantities will be left off the list until that’s settled.</span>
            <div className="spacer" /><Link className="btn small" to="/ingredients">Review {needs.data.length}</Link></div>
        )}
      </div>

      {picker && (
        <Modal onClose={() => setPicker(null)} width={400} eyebrow={picker.slot === 'breakfast' ? 'Breakfast' : 'Dinner · cooked ×2'} title={longDate(picker.day.date)}
          footer={<><span className="faint" style={{ fontSize: 12 }}>{current.length === 0 ? 'Pick one or more dishes' : `${current.length} chosen`}</span><div className="spacer" /><button className="btn primary" onClick={() => setPicker(null)}>Done</button></>}>
          <input className="input" placeholder="Type to filter" value={filter} onChange={(e) => setFilter(e.target.value)} autoFocus />
          {recipes.data?.length === 0 && <div className="empty">No recipes yet — <Link to="/recipes">add one</Link>.</div>}
          <div className="col" style={{ gap: 1, maxHeight: 340, overflowY: 'auto' }}>
            {options.map((r) => { const on = current.includes(r.id); return (
              <div key={r.id} className={'option' + (on ? ' on' : '')} onClick={async () => { const ids = on ? current.filter((x) => x !== r.id) : [...current, r.id]; await setSlot(picker.day, picker.slot, ids); setPicker((p) => p && { ...p, day: { ...p.day, [p.slot]: ids.map((id) => ({ id, title: recipes.data?.find((x) => x.id === id)?.title ?? null })) } }); }}>
                <span className={'box' + (on ? ' on' : '')}>{on && <Check size={11} />}</span><span className="serif" style={{ fontSize: 16, flexGrow: 1 }}>{r.title}</span><small className="mono faint">{r.ingredients.length}</small>
              </div>); })}
          </div>
        </Modal>
      )}
    </>
  );
}

function SlotCell({ day, slot, onOpen, onRemove }: { day: WeekDay; slot: Slot; onOpen: () => void; onRemove: (id: string) => void }) {
  const dishes = day[slot];
  if (dishes.length === 0) return <div className="slot empty" onClick={onOpen} role="button" aria-label={`add ${slot} for ${day.date}`}><Plus size={16} /></div>;
  return (
    <div className="slot" onClick={onOpen}>
      {dishes.map((r) => <div key={r.id} className="dish"><span>{r.title ?? '?'}</span><button aria-label={`remove ${r.title}`} onClick={(e) => { e.stopPropagation(); onRemove(r.id); }}><X size={11} /></button></div>)}
    </div>
  );
}
