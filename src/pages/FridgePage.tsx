import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FlowStrip } from '../components/FlowStrip';
import { Minus, Plus, Warn } from '../components/Icons';
import { api, errorMessage } from '../lib/api';
import { rangeLabel } from '../lib/dates';
import { formatQty, UNIT_LABEL } from '../lib/format';
import { keys, useDateParam, useIngredients, useNeeded, useSettings, useStores } from '../lib/hooks';
import type { Unit } from '../lib/types';

export function FridgePage() {
  const [date] = useDateParam();
  const needed = useNeeded(date); const settings = useSettings(); const ings = useIngredients(); const stores = useStores();
  const storeById = Object.fromEntries((stores.data ?? []).map((s) => [s.id, s]));
  async function toggleLow(id: string, isLow: boolean) { setError(null); try { await api.ingredients.setLow(id, isLow); qc.invalidateQueries({ queryKey: keys.needed(date) }); qc.invalidateQueries({ queryKey: keys.ingredients }); } catch (e) { setError(errorMessage(e)); } }
  const nav = useNavigate(); const qc = useQueryClient();
  const [have, setHave] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!needed.data) return;
    setHave(Object.fromEntries(needed.data.items.map((r) => [r.ingredient.id, r.stock ? String(r.stock.qty) : ''])));
  }, [needed.data]);

  const rows = needed.data?.items ?? [];
  const buyFor = (id: string, need: number | null) => { if (need === null) return null; const h = Number(have[id] || 0); return Math.max(0, need - h); };
  const toBuy = useMemo(() => rows.filter((r) => (buyFor(r.ingredient.id, r.needQty) ?? 0) > 0).length, [rows, have]); // eslint-disable-line react-hooks/exhaustive-deps
  const lowCount = (ings.data ?? []).filter((i) => i.kind === 'pantry' && i.isLow).length;
  const weeklyCount = (ings.data ?? []).filter((i) => i.kind === 'weekly').length;
  const step = (unit: Unit | null) => (unit === 'lb' || unit === 'bunch' ? 0.5 : 1);

  async function generate() {
    setBusy(true); setError(null);
    try {
      await api.freshStock.replace(rows.filter((r) => r.needUnit && Number(have[r.ingredient.id] || 0) > 0).map((r) => ({ ingredientId: r.ingredient.id, qty: Number(have[r.ingredient.id]), unit: r.needUnit as Unit })));
      await api.lists.generate(date);
      qc.invalidateQueries();
      nav(`/list?date=${date}`);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  return (
    <>
      <FlowStrip current={2} date={date} />
      <div className="page" style={{ flexDirection: 'row', gap: 26, alignItems: 'flex-start' }}>
        <div className="col" style={{ flex: 1, gap: 16, minWidth: 0 }}>
          <div className="col" style={{ gap: 6 }}>
            <h1 style={{ fontSize: 30 }}>What’s left in the fridge?</h1>
            <span className="muted">The fresh ingredients this week’s dishes call for, in the units you’d count them in. Zero counts as none on hand.</span>
          </div>
          <div className="card">
            <table className="table">
              <thead><tr><th>In the fridge</th><th className="num">Week needs</th><th className="num">You have</th><th className="num">You’ll buy</th></tr></thead>
              <tbody>
                {needed.isLoading && <tr><td colSpan={4} className="empty">Loading…</td></tr>}
                {rows.length === 0 && !needed.isLoading && <tr><td colSpan={4} className="empty">Nothing fresh is planned this week. <Link to={`/plan?date=${date}`}>Plan some dishes</Link> first.</td></tr>}
                {rows.map((r) => { const id = r.ingredient.id; const buy = buyFor(id, r.needQty); const u = r.needUnit; return (
                  <tr key={id}>
                    <td><span className="name">{r.ingredient.name}</span> <span className="chip form" style={{ marginLeft: 8 }}>{r.ingredient.form}</span>{r.problem && <div className="err row" style={{ gap: 6, marginTop: 4 }}><Warn size={12} />{r.problem}</div>}</td>
                    <td className="num mono muted">{r.needQty !== null && u ? `${formatQty(r.needQty)} ${UNIT_LABEL[u]}` : '—'}</td>
                    <td className="num"><div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                      <input aria-label={`${r.ingredient.name} in the fridge`} className="input mono small" style={{ width: 84, textAlign: 'right' }} type="number" min="0" step="any" value={have[id] ?? ''} onChange={(e) => setHave({ ...have, [id]: e.target.value })} />
                      <span className="faint" style={{ fontSize: 12, width: 40 }}>{u ? UNIT_LABEL[u] : ''}</span>
                      <button className="btn icon small" style={{ width: 26, height: 26 }} aria-label="less" onClick={() => setHave({ ...have, [id]: String(Math.max(0, Number(have[id] || 0) - step(u))) })}><Minus size={11} /></button>
                      <button className="btn icon small" style={{ width: 26, height: 26 }} aria-label="more" onClick={() => setHave({ ...have, [id]: String(Number(have[id] || 0) + step(u)) })}><Plus size={11} /></button>
                    </div></td>
                    <td className="num mono" style={{ color: buy ? 'var(--ink)' : 'var(--faint)', fontWeight: buy ? 500 : 400 }}>{buy === null ? '—' : buy > 0 && u ? `${formatQty(buy)} ${UNIT_LABEL[u]}` : 'nothing'}</td>
                  </tr>); })}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-head"><span className="eyebrow accent" style={{ fontSize: 10.5 }}>And in the pantry</span><span className="faint" style={{ fontSize: 12 }}>used by this week’s recipes — flag anything that’s low</span></div>
            {(needed.data?.pantry ?? []).length === 0 && !needed.isLoading && <div className="empty">This week’s recipes use no pantry items.</div>}
            {(needed.data?.pantry ?? []).map(({ ingredient: p, isLow }) => (
              <div key={p.id} className="row" style={{ padding: '9px 20px', borderBottom: '1px solid #f4efe6', gap: 12 }}>
                <span className="dot" style={{ background: storeById[p.storeId]?.color ?? '#ccc' }} />
                <span className="name serif" style={{ fontSize: 16, flexGrow: 1 }}>{p.name}</span>
                <span className="faint" style={{ fontSize: 12.5 }}>{storeById[p.storeId]?.name ?? ''}</span>
                <button className={'btn small' + (isLow ? ' warn' : '')} onClick={() => toggleLow(p.id, !isLow)}>{isLow ? 'On the list' : 'Mark low'}</button>
              </div>))}
          </div>
        </div>
        <div className="col" style={{ width: 300, gap: 14, paddingTop: 68, flexShrink: 0 }}>
          <div className="card"><div className="card-body">
            <span className="eyebrow">Ready to generate</span>
            <div className="col" style={{ gap: 8, fontSize: 13.5 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Week</span><span>{needed.data ? rangeLabel(needed.data.startDate, needed.data.endDate) : '…'}</span></div>
              <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Cooking for</span><span className="mono">{settings.data?.people ?? 2} people</span></div>
              <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Fresh to buy</span><span className="mono">{toBuy} items</span></div>
              <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Running low</span><span className="mono">{lowCount} items</span></div>
              <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Weekly</span><span className="mono">{weeklyCount} items</span></div>
            </div>
            <div style={{ height: 1, background: 'var(--rule-soft)' }} />
            <button className="btn primary" style={{ justifyContent: 'center', padding: 13 }} disabled={busy || needed.isLoading} onClick={generate}>{busy ? 'Generating…' : 'Generate shopping list'}</button>
            {error && <div className="err">{error}</div>}
          </div></div>
          {rows.some((r) => r.problem) && <div className="banner amber" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--amber)', display: 'flex', flexShrink: 0 }}><Warn size={17} /></span>
            <div className="col" style={{ gap: 5, fontSize: 12.5 }}><span>Some ingredients can’t be totalled until a conversion is settled. They’ll be left off the list.</span><Link to="/ingredients" style={{ fontWeight: 600 }}>Review conversions</Link></div></div>}
        </div>
      </div>
    </>
  );
}
