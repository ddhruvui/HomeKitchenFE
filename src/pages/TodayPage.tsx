import { useState } from 'react';
import { Left, Right } from '../components/Icons';
import { addDays, longDate, relativeDay, todayStr } from '../lib/dates';
import { formatQty, UNIT_LABEL } from '../lib/format';
import { useDateParam, useToday } from '../lib/hooks';
import type { ScaledRecipe } from '../lib/types';

export function TodayPage() {
  const [date, setDate] = useDateParam();
  const today = useToday(date);
  const [done, setDone] = useState<Set<string>>(new Set());
  const t = today.data;
  const toggle = (k: string) => setDone((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const isToday = date === todayStr();

  const Card = ({ slot, label, factor, recipes }: { slot: string; label: string; factor: string; recipes: ScaledRecipe[] }) => (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 200 }}>
      <div className="card-head"><span className="eyebrow accent">{label}</span><span className="faint" style={{ fontSize: 12 }}>{factor}</span></div>
      <div style={{ paddingBottom: 10 }}>
        {recipes.length === 0 && <div className="empty">Nothing planned for {label.toLowerCase()}</div>}
        {recipes.map((r, ri) => (
          <div key={r.recipeId} style={ri > 0 ? { borderTop: '1px solid var(--rule-soft)', marginTop: 6 } : undefined}>
            <div className="col" style={{ gap: 3, padding: '16px 20px 8px' }}><span className="serif" style={{ fontSize: 22, fontWeight: 500 }}>{r.title}</span><span className="faint" style={{ fontSize: 12 }}>{r.lines.length} ingredients · {r.steps.length} steps</span></div>
            <div style={{ padding: '12px 20px 4px' }}><span className="eyebrow" style={{ fontSize: 10.5 }}>Ingredients</span></div>
            {r.lines.map((l, i) => <div key={i} className="line"><span className="q">{l.qty !== undefined ? formatQty(l.qty) : ''}</span><span className="u">{l.unit ? UNIT_LABEL[l.unit] : ''}</span><span><span className="n">{l.name}</span>{l.note && <small>{l.note}</small>}</span></div>)}
            {r.steps.length > 0 && <div style={{ padding: '12px 20px 4px' }}><span className="eyebrow" style={{ fontSize: 10.5 }}>Method</span></div>}
            {r.steps.map((s, i) => { const k = `${date}|${slot}|${r.recipeId}|${i}`; const d = done.has(k); return (
              <div key={i} className={'step' + (d ? ' done' : '')} onClick={() => toggle(k)}><span className="num">{d ? '✓' : i + 1}</span><span className="t">{s}</span></div>); })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div className="col" style={{ gap: 4 }}><span className={'eyebrow' + (isToday ? ' accent' : '')}>{relativeDay(date)}{isToday ? ' · from this week’s plan' : ''}</span><h1>{longDate(date)}</h1></div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn icon" aria-label="previous day" onClick={() => setDate(addDays(date, -1))}><Left size={15} /></button>
          <button className="btn" disabled={isToday} onClick={() => setDate(todayStr())}>Today</button>
          <button className="btn icon" aria-label="next day" onClick={() => setDate(addDays(date, 1))}><Right size={15} /></button>
        </div>
      </div>
      <div className="banner soft" style={{ alignSelf: 'flex-start' }}><span className="eyebrow" style={{ fontSize: 10.5 }}>Lunch</span>
        <span>{t && t.lunch.length ? `${t.lunch.join(' + ')}, carried over from last night — nothing to cook` : 'Nothing carried over'}</span></div>
      {t && (
        <div className="cook-grid">
          <Card slot="b" label="Breakfast" factor={`amounts for ${t.people} people · ×1`} recipes={t.breakfast} />
          <Card slot="d" label="Dinner" factor={`amounts for ${t.people} people · ×2 — tonight and tomorrow’s lunch`} recipes={t.dinner} />
        </div>
      )}
    </div>
  );
}
