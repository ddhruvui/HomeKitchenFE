import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FlowStrip } from '../components/FlowStrip';
import { Check, Warn, X } from '../components/Icons';
import { api, errorMessage } from '../lib/api';
import { rangeLabel } from '../lib/dates';
import { qtyUnit, formatQty } from '../lib/format';
import { keys, useDateParam, useList, useSettings, useStores } from '../lib/hooks';
import type { ShoppingItem } from '../lib/types';

export function ListPage() {
  const [date] = useDateParam();
  const list = useList(date); const stores = useStores(); const settings = useSettings(); const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState<{ storeId: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const l = list.data;
  const stale = !!l && !!settings.data && l.people !== settings.data.people;
  const refresh = (data: unknown) => { qc.setQueryData(keys.list(date), data); qc.invalidateQueries({ queryKey: keys.ingredients }); };
  const byStore = useMemo(() => {
    const m = new Map<string, ShoppingItem[]>();
    for (const it of l?.items ?? []) m.set(it.storeId, [...(m.get(it.storeId) ?? []), it]);
    return m;
  }, [l]);
  const orderedStores = (stores.data ?? []).filter((s) => byStore.has(s.id));
  const bought = (l?.items ?? []).filter((i) => i.checked).length;

  async function generate() { setBusy(true); setError(null); try { refresh(await api.lists.generate(date)); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } }
  async function toggle(it: ShoppingItem) { if (!l) return; try { refresh(await api.lists.check(l.id, it.ingredientId, !it.checked)); } catch (e) { setError(errorMessage(e)); } }
  async function addManual() { if (!l || !manual?.name.trim()) return; try { refresh(await api.lists.addManual(l.id, { name: manual.name.trim(), storeId: manual.storeId })); setManual(null); } catch (e) { setError(errorMessage(e)); } }
  async function flagPantry(ingredientId: string, isLow: boolean) { if (!l) return; try { refresh(await api.lists.pantry(l.id, ingredientId, isLow)); } catch (e) { setError(errorMessage(e)); } }
  const toCheck = (l?.pantryCheck ?? []).filter((p) => !p.isLow);
  async function removeManual(it: ShoppingItem) { if (!l) return; try { refresh(await api.lists.removeManual(l.id, it.ingredientId)); } catch (e) { setError(errorMessage(e)); } }

  return (
    <>
      <FlowStrip current={3} date={date} />
      <div className="page">
        <div className="page-head">
          <div className="col" style={{ gap: 4 }}><span className="eyebrow">Shopping list</span><h1>{l ? rangeLabel(l.startDate, l.endDate) : 'No list yet'}</h1></div>
          {l && <div className="row" style={{ gap: 22 }}>
            {stale && <span className="banner amber" style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>Household changed — regenerate to apply</span>}
            <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}><span className="faint" style={{ fontSize: 11.5 }}>Scaled for</span><span className="mono">{l.people} people</span></div>
            <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}><span className="faint" style={{ fontSize: 11.5 }}>Bought</span><span className="mono">{bought} of {l.items.length}</span></div>
            <button className={'btn' + (stale ? ' primary' : '')} disabled={busy} onClick={generate}>{stale ? `Regenerate for ${settings.data?.people}` : 'Regenerate'}</button>
          </div>}
        </div>
        {error && <div className="banner red">{error}</div>}
        {list.isLoading && <div className="empty">Loading…</div>}
        {!list.isLoading && !l && <div className="card"><div className="empty">No list has been generated for this week. <Link to={`/fridge?date=${date}`}>Check the fridge</Link> and generate one.</div></div>}
        {l && toCheck.length > 0 && (
          <div className="card"><div className="card-body" style={{ gap: 10 }}>
            <div className="row" style={{ gap: 10 }}><span className="eyebrow accent">Check the pantry</span><span className="faint" style={{ fontSize: 12.5 }}>This week cooks with these and nobody has flagged them. Low on one? It goes straight onto its store’s list.</span></div>
            <div className="chips">{toCheck.map((p) => <button key={p.ingredientId} className="storechip" onClick={() => flagPantry(p.ingredientId, true)} title="Mark low and add to the list"><span className="dot" style={{ background: (stores.data ?? []).find((s) => s.id === p.storeId)?.color ?? '#ccc' }} />{p.name}<span className="faint" style={{ marginLeft: 4, fontSize: 11 }}>+</span></button>)}</div>
          </div></div>
        )}
        {l && l.problems.length > 0 && <div className="banner amber"><span style={{ color: 'var(--amber)', display: 'flex' }}><Warn size={18} /></span>
          <span>Left off because a conversion is missing: {l.problems.map((p) => p.name).join(', ')}. <Link to="/ingredients">Fix the conversions</Link> and regenerate.</span></div>}

        {l && (
          <div className="stores-grid">
            {orderedStores.map((s) => {
              const items = byStore.get(s.id) ?? [];
              let lastGroup = '';
              return (
                <div key={s.id} className="card" style={{ paddingBottom: 10 }}>
                  <div className="row" style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule-soft)', gap: 9 }}>
                    <span className="dot" style={{ background: s.color, width: 10, height: 10 }} /><span className="serif" style={{ fontSize: 18, fontWeight: 500, flexGrow: 1 }}>{s.name}</span>
                    <span className="mono faint" style={{ fontSize: 12.5 }}>{items.filter((i) => i.checked).length}/{items.length}</span>
                  </div>
                  {items.map((it) => {
                    const showGroup = it.group !== lastGroup; lastGroup = it.group;
                    const isOpen = open === it.ingredientId && it.source === 'auto';
                    return (
                      <div key={it.ingredientId + it.source}>
                        {showGroup && <div className={'group' + (it.source === 'low' ? ' low' : '')}><span className="eyebrow" style={{ fontSize: 10 }}>{it.group}</span></div>}
                        <div style={isOpen ? { background: '#fffdf7' } : undefined}>
                          <div className={'item' + (it.checked ? ' done' : '')} onClick={() => toggle(it)} role="checkbox" aria-checked={it.checked} aria-label={it.name}>
                            <span className={'box green' + (it.checked ? ' on' : '')} style={{ marginTop: 2 }}>{it.checked && <Check size={12} />}</span>
                            <span className="n">{it.name}</span>
                            <div className="col" style={{ gap: 1, alignItems: 'flex-end' }} onClick={(e) => { if (it.source === 'auto') { e.stopPropagation(); setOpen(isOpen ? null : it.ingredientId); } }}>
                              {it.buyQty !== undefined && <span className="q">{qtyUnit(it.buyQty, it.buyUnit)}</span>}
                              {it.source === 'weekly' && <span className="wk">every week</span>}
                              {it.source === 'low' && it.checked && <span className="rep">replenished</span>}
                              {it.altQty !== undefined && it.altUnit && <span className="alt">≈ {qtyUnit(it.altQty, it.altUnit)}</span>}
                            </div>
                            {it.source === 'manual' && <button aria-label="remove" style={{ color: '#c0b7ab' }} onClick={(e) => { e.stopPropagation(); removeManual(it); }}><X size={12} /></button>}
                          </div>
                          {isOpen && it.needQty !== undefined && <div className="math"><span>need {formatQty(it.needQty)}</span><span>·</span><span>have {formatQty(it.haveQty ?? 0)}</span><span>·</span><span>short {formatQty(Math.max(0, it.needQty - (it.haveQty ?? 0)))} {it.needUnit}</span></div>}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ padding: '8px 16px 4px' }}>
                    {manual?.storeId === s.id ? (
                      <form className="row" onSubmit={(e) => { e.preventDefault(); addManual(); }}>
                        <input className="input small" placeholder="One-off item" autoFocus value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
                        <button className="btn small primary" type="submit">Add</button><button className="btn small" type="button" onClick={() => setManual(null)}>Cancel</button>
                      </form>
                    ) : <button className="faint" style={{ fontSize: 12.5 }} onClick={() => setManual({ storeId: s.id, name: '' })}>+ Add a one-off item</button>}
                  </div>
                </div>
              );
            })}
            {(stores.data ?? []).filter((s) => !byStore.has(s.id)).length > 0 && l.items.length > 0 && null}
            {l.items.length === 0 && <div className="empty">Nothing to buy this week.</div>}
          </div>
        )}
        {l && <div className="banner soft" style={{ alignSelf: 'flex-start' }}>Tap a quantity to see the arithmetic. Running-low lines carry no number — you know how much rice to buy. Ticking never removes a line; it stays until the next list is generated.</div>}
      </div>
    </>
  );
}
