import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { IngredientDialog } from '../components/IngredientDialog';
import { Modal } from '../components/Modal';
import { Plus, Warn, X } from '../components/Icons';
import { api, errorMessage } from '../lib/api';
import { UNIT_LABEL } from '../lib/format';
import { byExpiryThenName, expiryLabel, expiryStatus } from '../lib/dates';
import { keys, useIngredients, useNeedsBridge, useRecipes, useStores } from '../lib/hooks';
import type { BridgeEstimate, Ingredient, IngredientKind, Store } from '../lib/types';

const KIND_LABEL: Record<IngredientKind, string> = { fresh: 'Fresh', weekly: 'Weekly', pantry: 'Pantry' };

export function IngredientsPage() {
  const ings = useIngredients(); const stores = useStores(); const needs = useNeedsBridge(); const recipes = useRecipes(); const qc = useQueryClient();
  const usedIn = (id: string) => (recipes.data ?? []).filter((r) => r.ingredients.some((l) => l.ingredientId === id)).map((r) => r.title);
  const [filter, setFilter] = useState<'all' | IngredientKind>('all');
  const [dialog, setDialog] = useState<{ initial?: Ingredient } | null>(null);
  const [storesOpen, setStoresOpen] = useState(false);
  const [ai, setAi] = useState<{ busy: boolean; estimates: BridgeEstimate[]; edits: Record<string, { ozPerCup: string; ozPerCount: string }>; error?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const storeById = Object.fromEntries((stores.data ?? []).map((s) => [s.id, s]));
  const rows = (ings.data ?? []).filter((i) => filter === 'all' || i.kind === filter).sort(byExpiryThenName);
  const expiryColor = (d: string) => ({ expired: 'var(--red)', soon: 'var(--amber)', later: 'var(--muted)' })[expiryStatus(d).status];
  const invalidate = () => { qc.invalidateQueries({ queryKey: keys.ingredients }); qc.invalidateQueries({ queryKey: keys.needsBridge }); qc.invalidateQueries({ queryKey: ['needed'] }); };

  const counted = (i: Ingredient) => {
    if (i.kind === 'pantry') return <span className="serif faint" style={{ fontStyle: 'italic' }}>no quantity — marked low</span>;
    if (i.kind === 'weekly') return `${i.weeklyQty} every week`;
    const parts = [i.buyUnit ? `by ${UNIT_LABEL[i.buyUnit]}` : '']; if (i.ozPerCount && i.countUnit) parts.push(`${i.ozPerCount} oz per ${i.countUnit}`); if (i.ozPerCup) parts.push(`${i.ozPerCup} oz per cup`);
    return parts.filter(Boolean).join(' · ');
  };
  async function toggleLow(i: Ingredient) { try { await api.ingredients.setLow(i.id, !i.isLow); invalidate(); } catch (e) { setError(errorMessage(e)); } }
  async function remove(i: Ingredient) { if (!confirm(`Delete ${i.name}?`)) return; try { await api.ingredients.remove(i.id); invalidate(); } catch (e) { setError(errorMessage(e)); } }
  async function estimate() {
    setAi({ busy: true, estimates: [], edits: {} });
    try {
      const r = await api.ai.bridges();
      setAi({ busy: false, estimates: r.estimates, edits: Object.fromEntries(r.estimates.map((e) => [e.id, { ozPerCup: e.ozPerCup?.toString() ?? '', ozPerCount: e.ozPerCount?.toString() ?? '' }])) });
    } catch (e) { setAi({ busy: false, estimates: [], edits: {}, error: errorMessage(e) }); }
  }
  async function confirmBridge(id: string) {
    if (!ai) return; const e = ai.edits[id]; const body: { ozPerCup?: number; ozPerCount?: number } = {};
    if (e.ozPerCup.trim()) body.ozPerCup = Number(e.ozPerCup); if (e.ozPerCount.trim()) body.ozPerCount = Number(e.ozPerCount);
    try { await api.ingredients.setBridges(id, body); invalidate(); setAi({ ...ai, estimates: ai.estimates.filter((x) => x.id !== id) }); } catch (err) { setAi({ ...ai, error: errorMessage(err) }); }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="col" style={{ gap: 4 }}><span className="eyebrow">Everything this house buys</span><h1>Ingredients</h1></div>
        <div className="row" style={{ gap: 10 }}>
          <div className="seg">{(['all', 'fresh', 'weekly', 'pantry'] as const).map((k) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{k === 'all' ? 'All' : KIND_LABEL[k]}</button>)}</div>
          <button className="btn" onClick={() => setStoresOpen(true)}>Stores</button>
          <button className="btn primary" disabled={(stores.data ?? []).length === 0} onClick={() => setDialog({})}><Plus size={14} />New ingredient</button>
        </div>
      </div>
      {error && <div className="banner red">{error}</div>}
      {(stores.data ?? []).length === 0 && !stores.isLoading && <div className="banner amber"><Warn size={17} /> Add your stores first — every ingredient is bought at exactly one. <button className="btn small" style={{ marginLeft: 'auto' }} onClick={() => setStoresOpen(true)}>Add stores</button></div>}

      {needs.data && needs.data.length > 0 && (
        <div className="card"><div className="card-body" style={{ background: 'var(--amber-soft)' }}>
          <div className="row" style={{ gap: 12 }}><span style={{ color: 'var(--amber)', display: 'flex' }}><Warn size={18} /></span>
            <div className="col" style={{ gap: 2, flexGrow: 1 }}><b style={{ fontSize: 14 }}>{needs.data.length} ingredient{needs.data.length > 1 ? 's' : ''} need{needs.data.length > 1 ? '' : 's'} a conversion</b>
              <span style={{ fontSize: 13, color: '#6b5327' }}>{needs.data.map((n) => `${n.ingredient.name} (${n.units.map((u) => UNIT_LABEL[u]).join(', ')} → ${n.needs.join(' and ')})`).join(' · ')}</span></div>
            <button className="btn primary" disabled={ai?.busy} onClick={estimate}>{ai?.busy ? 'Asking Gemini…' : 'Estimate with AI'}</button></div>
          {ai?.error && <div className="err">{ai.error}</div>}
          {ai && !ai.busy && ai.estimates.length === 0 && !ai.error && <span className="muted" style={{ fontSize: 13 }}>No usable estimates came back — enter the numbers by hand via Edit.</span>}
          {ai?.estimates.map((e) => (
            <div key={e.id} className="card" style={{ background: 'var(--surface)' }}><div className="card-body" style={{ gap: 10 }}>
              <div className="row"><span className="serif" style={{ fontSize: 17 }}>{e.name}</span><span className="faint" style={{ fontSize: 12.5 }}>{e.rationale}</span></div>
              <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
                <div className="field"><label>1 cup ≈ oz</label><input className="input mono small" style={{ width: 110 }} value={ai.edits[e.id]?.ozPerCup ?? ''} onChange={(ev) => setAi({ ...ai, edits: { ...ai.edits, [e.id]: { ...ai.edits[e.id], ozPerCup: ev.target.value } } })} /></div>
                <div className="field"><label>1 count ≈ oz</label><input className="input mono small" style={{ width: 110 }} value={ai.edits[e.id]?.ozPerCount ?? ''} onChange={(ev) => setAi({ ...ai, edits: { ...ai.edits, [e.id]: { ...ai.edits[e.id], ozPerCount: ev.target.value } } })} /></div>
                <div className="spacer" /><button className="btn success" onClick={() => confirmBridge(e.id)}>Looks right</button></div>
              <span className="faint" style={{ fontSize: 12 }}>Saved on the ingredient once you confirm. Every recipe that uses it reuses the number.</span>
            </div></div>))}
        </div></div>
      )}

      <div className="card">
        <table className="table">
          <thead><tr><th>Name</th><th>Kind</th><th>Store</th><th>How it’s counted</th><th>Expires</th><th className="num">Status</th><th /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="empty">Nothing here yet.</td></tr>}
            {rows.map((i) => (
              <tr key={i.id}>
                <td className="name">{i.name}</td>
                <td><span className={'chip ' + i.kind}>{KIND_LABEL[i.kind]}</span></td>
                <td><span className="row" style={{ gap: 8 }}><span className="dot" style={{ background: storeById[i.storeId]?.color ?? '#ccc' }} />{storeById[i.storeId]?.name ?? '—'}</span></td>
                <td className="muted" style={{ fontSize: 13 }}>{counted(i)}</td>
                <td style={{ fontSize: 12.5 }}>{i.expiresOn ? <div className="col" style={{ gap: 2 }}><span style={{ color: expiryColor(i.expiresOn), fontWeight: expiryStatus(i.expiresOn).status === 'later' ? 400 : 600, whiteSpace: 'nowrap' }}><span className="mono">{i.expiresOn}</span> · {expiryLabel(i.expiresOn)}</span><span className="faint" style={{ fontSize: 11.5 }}>{usedIn(i.id).length ? `use it up in ${usedIn(i.id).join(', ')}` : 'no recipe uses this yet'}</span></div> : <span className="faint">—</span>}</td>
                <td className="num">{i.kind === 'pantry' && <button className={'btn small' + (i.isLow ? ' warn' : '')} onClick={() => toggleLow(i)}>{i.isLow ? 'On the list' : 'Mark low'}</button>}</td>
                <td className="num"><span className="row" style={{ justifyContent: 'flex-end', gap: 6 }}><button className="btn small" onClick={() => setDialog({ initial: i })}>Edit</button><button aria-label={`delete ${i.name}`} className="faint" onClick={() => remove(i)}><X size={13} /></button></span></td>
              </tr>))}
          </tbody>
        </table>
      </div>

      {dialog && <IngredientDialog stores={stores.data ?? []} initial={dialog.initial} onClose={() => setDialog(null)} onSaved={() => { invalidate(); setDialog(null); }} />}
      {storesOpen && <StoresDialog stores={stores.data ?? []} onClose={() => setStoresOpen(false)} onChange={() => qc.invalidateQueries({ queryKey: keys.stores })} />}
    </div>
  );
}

const PALETTE = ['#4f8a5f', '#b07d33', '#5b7cb8', '#b96b62', '#7a6bb8', '#5f8a8a'];
function StoresDialog({ stores, onClose, onChange }: { stores: Store[]; onClose: () => void; onChange: () => void }) {
  const [name, setName] = useState(''); const [error, setError] = useState<string | null>(null);
  async function add() { if (!name.trim()) return; try { await api.stores.create({ name: name.trim(), color: PALETTE[stores.length % PALETTE.length] }); setName(''); onChange(); } catch (e) { setError(errorMessage(e)); } }
  async function move(s: Store, dir: -1 | 1) {
    const sorted = stores.slice().sort((a, b) => a.sortOrder - b.sortOrder); const i = sorted.indexOf(s); const j = i + dir; if (j < 0 || j >= sorted.length) return;
    try { await api.stores.update(s.id, { sortOrder: j }); await api.stores.update(sorted[j].id, { sortOrder: i }); onChange(); } catch (e) { setError(errorMessage(e)); }
  }
  async function remove(s: Store) { try { await api.stores.remove(s.id); onChange(); } catch (e) { setError(errorMessage(e)); } }
  return (
    <Modal title="Stores" eyebrow="In the order you visit them" onClose={onClose} footer={<><div className="spacer" /><button className="btn" onClick={onClose}>Done</button></>}>
      <div className="col" style={{ gap: 6 }}>
        {stores.slice().sort((a, b) => a.sortOrder - b.sortOrder).map((s) => (
          <div key={s.id} className="row" style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--paper)' }}>
            <span className="dot" style={{ background: s.color, width: 11, height: 11 }} /><span className="serif" style={{ fontSize: 16, flexGrow: 1 }}>{s.name}</span>
            <button className="btn small" onClick={() => move(s, -1)}>↑</button><button className="btn small" onClick={() => move(s, 1)}>↓</button>
            <button aria-label={`delete ${s.name}`} className="faint" onClick={() => remove(s)}><X size={13} /></button>
          </div>))}
        {stores.length === 0 && <span className="empty" style={{ padding: 12 }}>No stores yet.</span>}
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); add(); }}><input className="input" placeholder="Costco, Indian Store, Walmart, ShopRite…" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn primary" type="submit">Add</button></form>
      {error && <div className="err">{error}</div>}
    </Modal>
  );
}
