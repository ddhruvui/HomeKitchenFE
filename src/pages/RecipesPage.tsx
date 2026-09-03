import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { IngredientDialog } from '../components/IngredientDialog';
import { Check, Down, Plus, Up, Warn, X } from '../components/Icons';
import { ingredientInputFor, linesFromDraft, undecided, type Decision, type LineDraft } from '../lib/draft';
import { api, errorMessage, type RecipeInput } from '../lib/api';
import { UNIT_LABEL, unitsFor } from '../lib/format';
import { keys, useIngredients, useRecipes, useStores } from '../lib/hooks';
import type { Ingredient, Recipe, RecipeDraft, Unit } from '../lib/types';
const blank = (): RecipeInput & { lines: LineDraft[] } => ({ title: '', ingredients: [], steps: [''], tags: [], lines: [] });

export function RecipesPage() {
  const recipes = useRecipes(); const ings = useIngredients(); const stores = useStores(); const qc = useQueryClient();
  const [selected, setSelected] = useState<string | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(blank());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newIng, setNewIng] = useState<number | null>(null);
  const [ai, setAi] = useState<{ busy: boolean; draft?: RecipeDraft; decisions: Record<number, Decision>; error?: string } | null>(null);
  const byId = useMemo(() => Object.fromEntries((ings.data ?? []).map((i) => [i.id, i])), [ings.data]);

  useEffect(() => {
    setAi(null);
    if (selected === 'new' || selected === null) { setDraft(blank()); return; }
    const r = recipes.data?.find((x) => x.id === selected);
    if (r) setDraft({ title: r.title, tags: r.tags, steps: r.steps.length ? r.steps : [''], ingredients: [], lines: r.ingredients.map((l) => ({ ingredientId: l.ingredientId, qty: l.qty?.toString() ?? '', unit: l.unit ?? '', note: l.note ?? '' })) });
  }, [selected, recipes.data]);

  const filtered = (recipes.data ?? []).filter((r) => r.title.toLowerCase().includes(search.toLowerCase()));
  const setLine = (i: number, patch: Partial<LineDraft>) => setDraft((d) => ({ ...d, lines: d.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const setStep = (i: number, v: string) => setDraft((d) => ({ ...d, steps: d.steps.map((s, j) => (j === i ? v : s)) }));
  const moveStep = (i: number, dir: -1 | 1) => setDraft((d) => { const s = d.steps.slice(); const j = i + dir; if (j < 0 || j >= s.length) return d; [s[i], s[j]] = [s[j], s[i]]; return { ...d, steps: s }; });

  async function save() {
    setBusy(true); setError(null);
    const body: RecipeInput = {
      title: draft.title.trim(), tags: draft.tags, steps: draft.steps.map((s) => s.trim()).filter(Boolean),
      ingredients: draft.lines.filter((l) => l.ingredientId).map((l) => ({ ingredientId: l.ingredientId, ...(l.qty.trim() ? { qty: Number(l.qty) } : {}), ...(l.unit ? { unit: l.unit } : {}), ...(l.note.trim() ? { note: l.note.trim() } : {}) })),
    };
    try {
      const saved = selected === 'new' || selected === null ? await api.recipes.create(body) : await api.recipes.update(selected, body);
      await qc.invalidateQueries({ queryKey: keys.recipes }); qc.invalidateQueries({ queryKey: keys.needsBridge });
      setSelected(saved.id);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function remove() {
    if (!selected || selected === 'new' || !confirm('Delete this recipe?')) return;
    try { await api.recipes.remove(selected); qc.invalidateQueries({ queryKey: keys.recipes }); setSelected(null); } catch (e) { setError(errorMessage(e)); }
  }
  const editing = selected !== null;

  async function draftWithAi() {
    setAi({ busy: true, decisions: {} });
    try { const d = await api.ai.recipe(draft.title.trim()); setAi({ busy: false, draft: d, decisions: {} }); }
    catch (e) { setAi({ busy: false, decisions: {}, error: errorMessage(e) }); }
  }
  async function useDraft() {
    if (!ai?.draft) return;
    const d = ai.draft; setAi({ ...ai, busy: true, error: undefined });
    try {
      const created: Record<number, string> = {};
      for (const [i, line] of d.lines.entries()) {
        const dec = ai.decisions[i];
        if (line.match || dec?.skip || !dec?.storeId) continue;
        created[i] = (await api.ingredients.create(ingredientInputFor(line, dec.storeId))).id;
      }
      await qc.invalidateQueries({ queryKey: keys.ingredients });
      setDraft((cur) => ({ ...cur, title: cur.title.trim() || d.title, lines: linesFromDraft(d.lines, created, ai.decisions), steps: d.steps.length ? d.steps : [''] }));
      setAi(null);
    } catch (e) { setAi({ ...ai, busy: false, error: errorMessage(e) }); }
  }

  return (
    <div className="page">
      <div className="page-head"><div className="col" style={{ gap: 4 }}><span className="eyebrow">Recipes</span><h1>{recipes.data?.length ?? 0} in the book</h1></div>
        <button className="btn primary" onClick={() => setSelected('new')}><Plus size={14} />New recipe</button></div>
      <div className="split">
        <div className="card"><div style={{ padding: 12 }}><input className="input" placeholder="Search recipes" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="col" style={{ gap: 2, padding: '0 8px 8px' }}>
            {filtered.length === 0 && <div className="empty">No recipes yet.</div>}
            {filtered.map((r) => <div key={r.id} className={'list-item' + (selected === r.id ? ' on' : '')} onClick={() => setSelected(r.id)}><span>{r.title}</span><small>{r.ingredients.length}</small></div>)}
          </div></div>

        {!editing ? <div className="card"><div className="empty">Pick a recipe on the left, or start a new one.</div></div> : (
          <div className="col" style={{ gap: 16 }}>
            <div className="card"><div className="card-body">
              <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <div className="field" style={{ flex: 2 }}><label htmlFor="r-title">Title</label><input id="r-title" className="input serif" style={{ fontSize: 22 }} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Pav Bhaji" /></div>
                <div className="field" style={{ flex: 1 }}><label htmlFor="r-tags">Tags <span className="faint">(comma separated)</span></label><input id="r-tags" className="input" value={draft.tags.join(', ')} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} placeholder="veg, weeknight" /></div>
              </div>
              <div className="row">
                <span className="serif faint" style={{ fontStyle: 'italic', fontSize: 12.5, flexGrow: 1 }}>Amounts are for one meal, two people. Dinner doubles them; the household count scales the rest.</span>
                {selected === 'new' && draft.lines.length === 0 && <button className="btn warn small" disabled={!draft.title.trim() || !!ai?.busy} onClick={draftWithAi}>{ai?.busy && !ai.draft ? 'Asking Gemini…' : 'Draft with AI'}</button>}
              </div>
            </div></div>

            {ai?.error && !ai.draft && <div className="banner red">{ai.error}</div>}
            {ai?.draft && (() => { const d = ai.draft; const waiting = undecided(d.lines, ai.decisions); return (
              <div className="card"><div className="card-body" style={{ background: 'var(--amber-soft)', gap: 12 }}>
                <div className="row" style={{ gap: 12 }}>
                  <div className="col" style={{ gap: 2, flexGrow: 1 }}><b style={{ fontSize: 14 }}>Drafted by Gemini for two people</b><span style={{ fontSize: 13, color: '#6b5327' }}>{d.lines.filter((l) => l.match).length} of {d.lines.length} ingredients are already in your catalog. {waiting.length > 0 ? `Pick a store for the ${waiting.length} new one${waiting.length > 1 ? 's' : ''}, or skip them.` : 'Check the amounts, then use the draft.'}</span></div>
                  <button className="btn" onClick={() => setAi(null)}>Discard</button>
                  <button className="btn primary" disabled={ai.busy || waiting.length > 0} onClick={useDraft}>{ai.busy ? 'Creating…' : 'Use this draft'}</button>
                </div>
                {ai.error && <div className="err">{ai.error}</div>}
                <div className="card" style={{ background: 'var(--surface)' }}>
                  {d.lines.map((l, i) => { const dec = ai.decisions[i] ?? {}; const setDec = (p: Decision) => setAi({ ...ai, decisions: { ...ai.decisions, [i]: { ...dec, ...p } } }); return (
                    <div key={i} className="row" style={{ padding: '8px 16px', borderBottom: '1px solid var(--rule-soft)', gap: 12, opacity: dec.skip ? 0.45 : 1 }}>
                      <span className="mono" style={{ width: 88, fontSize: 13.5 }}>{l.qty !== undefined ? `${l.qty} ${l.unit ? UNIT_LABEL[l.unit] : l.rawUnit ?? ''}` : ''}</span>
                      <span className="serif" style={{ fontSize: 16, flexGrow: 1 }}>{l.name}{l.note && <span className="faint" style={{ fontFamily: 'var(--sans)', fontSize: 12, marginLeft: 8 }}>{l.note}</span>}</span>
                      {l.match ? <span className="row" style={{ gap: 6, fontSize: 12.5, color: 'var(--green-ink)' }}><Check size={13} />{l.match.name !== l.name ? `matched ${l.match.name}` : 'in catalog'}{l.match.confidence === 'partial' && <span className="faint">(closest)</span>}</span>
                        : <span className="row" style={{ gap: 8 }}>
                            <span className={'chip ' + (l.kind ?? 'pantry')}>{l.kind ?? 'pantry'}</span>
                            {!dec.skip && <select className="select" style={{ padding: '5px 8px', width: 150 }} value={dec.storeId ?? ''} onChange={(e) => setDec({ storeId: e.target.value || undefined })}><option value="">Which store?</option>{(stores.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
                            <button className="btn small" onClick={() => setDec({ skip: !dec.skip })}>{dec.skip ? 'Keep' : 'Skip'}</button>
                          </span>}
                      {l.rawUnit && !dec.skip && <span className="row err" style={{ gap: 4, fontSize: 12 }}><Warn size={12} />unit "{l.rawUnit}" — fix after</span>}
                    </div>); })}
                  <div style={{ padding: '10px 16px' }}><span className="faint" style={{ fontSize: 12.5 }}>{d.steps.length} steps · nothing is saved until you press Save recipe.</span></div>
                </div>
              </div></div>); })()}

            <div className="card">
              <div className="lines head"><span>Qty</span><span>Unit</span><span>Ingredient</span><span>Note</span><span /></div>
              {draft.lines.map((l, i) => { const ing: Ingredient | undefined = byId[l.ingredientId]; const pantry = ing?.kind === 'pantry'; return (
                <div key={i} className="lines" style={pantry ? { background: '#fdfcfa' } : undefined}>
                  <input aria-label="quantity" className="input mono small" type="number" min="0" step="any" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
                  <select aria-label="unit" className="select" style={{ padding: '6px 8px' }} value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value as Unit | '' })}><option value="">—</option>{unitsFor(ing).map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}</select>
                  <div className="row"><select aria-label="ingredient" className="select" style={{ padding: '6px 8px' }} value={l.ingredientId} onChange={(e) => { if (e.target.value === '__new') setNewIng(i); else setLine(i, { ingredientId: e.target.value, unit: '' }); }}>
                    <option value="">choose…</option>{(ings.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}<option value="__new">+ New ingredient…</option></select>
                    {ing && <span className={'chip ' + ing.kind}>{ing.kind}</span>}</div>
                  <input aria-label="note" className="input small" placeholder={pantry ? 'not counted — bought when low' : 'finely chopped'} value={l.note} onChange={(e) => setLine(i, { note: e.target.value })} />
                  <button aria-label="remove line" style={{ color: '#c0b7ab' }} onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, j) => j !== i) })}><X size={12} /></button>
                </div>); })}
              <button className="row faint" style={{ padding: '12px 20px', fontSize: 13.5 }} onClick={() => setDraft({ ...draft, lines: [...draft.lines, { ingredientId: '', qty: '', unit: '', note: '' }] })}><Plus size={14} />Add an ingredient</button>
            </div>

            <div className="card">
              <div className="card-head"><span className="serif" style={{ fontSize: 19, flexGrow: 1 }}>Method</span><span className="mono faint" style={{ fontSize: 12 }}>{draft.steps.filter((s) => s.trim()).length} steps</span></div>
              {draft.steps.map((s, i) => (
                <div key={i} className="row" style={{ padding: '8px 20px', gap: 10, alignItems: 'flex-start', borderBottom: '1px solid #f6f1e8' }}>
                  <span className="num mono" style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--soft)', color: 'var(--accent-ink)', fontSize: 11.5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 7 }}>{i + 1}</span>
                  <textarea aria-label={`step ${i + 1}`} className="textarea" rows={1} style={{ resize: 'vertical', minHeight: 36 }} value={s} placeholder="Boil the potatoes until soft." onChange={(e) => setStep(i, e.target.value)} />
                  <div className="col" style={{ gap: 2 }}><button aria-label="move up" style={{ color: '#c0b7ab' }} onClick={() => moveStep(i, -1)}><Up size={12} /></button><button aria-label="move down" style={{ color: '#c0b7ab' }} onClick={() => moveStep(i, 1)}><Down size={12} /></button></div>
                  <button aria-label="remove step" style={{ color: '#c0b7ab', marginTop: 8 }} onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_, j) => j !== i) })}><X size={12} /></button>
                </div>))}
              <button className="row faint" style={{ padding: '12px 20px', fontSize: 13.5 }} onClick={() => setDraft({ ...draft, steps: [...draft.steps, ''] })}><Plus size={14} />Add a step</button>
            </div>

            {error && <div className="banner red">{error}</div>}
            <div className="row" style={{ gap: 10 }}>
              {selected !== 'new' && <button className="btn danger" onClick={remove}>Delete recipe</button>}
              <div className="spacer" /><button className="btn" onClick={() => setSelected(null)}>Discard</button>
              <button className="btn primary" disabled={busy || !draft.title.trim()} onClick={save}>{busy ? 'Saving…' : 'Save recipe'}</button>
            </div>
          </div>)}
      </div>
      {newIng !== null && <IngredientDialog stores={stores.data ?? []} onClose={() => setNewIng(null)} onSaved={(ing) => { qc.invalidateQueries({ queryKey: keys.ingredients }); setLine(newIng, { ingredientId: ing.id, unit: '' }); setNewIng(null); }} />}
    </div>
  );
}
