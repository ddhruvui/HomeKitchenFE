import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { IngredientDialog } from '../components/IngredientDialog';
import { IngredientTable } from '../components/IngredientTable';
import { RecipeChat } from '../components/RecipeChat';
import { Check, Down, External, Plus, Up, X } from '../components/Icons';
import { api, errorMessage, type RecipeInput } from '../lib/api';
import { UNIT_LABEL, unitsFor } from '../lib/format';
import { byExpiryThenName } from '../lib/dates';
import { keys, useIngredients, useRecipes, useStores } from '../lib/hooks';
import type { Ingredient, Recipe, Unit } from '../lib/types';
/** A line while it is being edited: quantity is text until it is saved, and the unit may not be chosen yet. */
type LineDraft = { ingredientId: string; qty: string; unit: Unit | ''; note: string };
/** Tags are typed as one comma-separated string and split on save, so a trailing comma survives typing. */
const blank = (): RecipeInput & { lines: LineDraft[]; tagsText: string } => ({ title: '', ingredients: [], morningSteps: [''], steps: [''], tags: [], sources: [], tagsText: '', lines: [] });

/** A card whose header carries its name, a one-line hint, and an optional count. */
function CardHead({ title, hint, count }: { title: string; hint?: string; count?: string }) {
  return (
    <div className="card-head" style={{ alignItems: 'flex-start' }}>
      <div className="titles"><span className="title">{title}</span>{hint && <span className="hint">{hint}</span>}</div>
      {count && <span className="count" style={{ paddingTop: 5 }}>{count}</span>}
    </div>
  );
}

/** One half of the method: an ordered list of plain lines, edited in place. */
function StepsCard({ title, hint, placeholder, steps, onChange }: { title: string; hint: string; placeholder: string; steps: string[]; onChange: (s: string[]) => void }) {
  const move = (i: number, dir: -1 | 1) => { const s = steps.slice(); const j = i + dir; if (j < 0 || j >= s.length) return; [s[i], s[j]] = [s[j], s[i]]; onChange(s); };
  const label = title.toLowerCase();
  const n = steps.filter((s) => s.trim()).length;
  return (
    <div className="card">
      <CardHead title={title} hint={hint} count={`${n} step${n === 1 ? '' : 's'}`} />
      {steps.map((s, i) => (
        <div key={i} className="edit-row">
          <span className="num">{i + 1}</span>
          <textarea aria-label={`${label} step ${i + 1}`} className="textarea" rows={1} value={s} placeholder={placeholder} onChange={(e) => onChange(steps.map((x, j) => (j === i ? e.target.value : x)))} />
          <div className="tools">
            <button className="icon-btn" aria-label="move up" disabled={i === 0} onClick={() => move(i, -1)}><Up size={13} /></button>
            <button className="icon-btn" aria-label="move down" disabled={i === steps.length - 1} onClick={() => move(i, 1)}><Down size={13} /></button>
            <button className="icon-btn remove" aria-label={`remove ${label} step`} onClick={() => onChange(steps.filter((_, j) => j !== i))}><X size={12} /></button>
          </div>
        </div>))}
      <button className="add-row" onClick={() => onChange([...steps, ''])}><Plus size={14} />Add {/^[aeiou]/.test(label) ? 'an' : 'a'} {label} step</button>
    </div>
  );
}

const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());
const hostOf = (s: string) => { try { return new URL(s.trim()).hostname.replace(/^www\./, ''); } catch { return s; } };

/** Where the recipe came from — a link or a plain note — kept for reference, never read by the planner. */
function SourcesCard({ sources, onChange }: { sources: string[]; onChange: (s: string[]) => void }) {
  return (
    <div className="card">
      <CardHead title="Sources" hint="Where this recipe came from — a video, a blog, a book, someone's notebook. For reference only." count={sources.filter((s) => s.trim()).length ? `${sources.filter((s) => s.trim()).length} saved` : undefined} />
      {sources.map((s, i) => (
        <div key={i} className="edit-row" style={{ alignItems: 'center' }}>
          <input aria-label={`source ${i + 1}`} className="input" value={s} placeholder="https://… or “Mom's notebook”" onChange={(e) => onChange(sources.map((x, j) => (j === i ? e.target.value : x)))} />
          <div className="tools" style={{ opacity: 1 }}>
            {isUrl(s) && <a className="icon-btn" href={s.trim()} target="_blank" rel="noreferrer" aria-label={`open ${hostOf(s)}`} title={`Open ${hostOf(s)}`}><External size={14} /></a>}
            <button className="icon-btn remove" aria-label="remove source" onClick={() => onChange(sources.filter((_, j) => j !== i))}><X size={12} /></button>
          </div>
        </div>))}
      <button className="add-row" onClick={() => onChange([...sources, ''])}><Plus size={14} />Add a source</button>
    </div>
  );
}

export function RecipesPage() {
  const recipes = useRecipes(); const ings = useIngredients(); const stores = useStores(); const qc = useQueryClient();
  const [selected, setSelected] = useState<string | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [draft, setDraft] = useState(blank());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newIng, setNewIng] = useState<number | null>(null);
  const byId = useMemo(() => Object.fromEntries((ings.data ?? []).map((i) => [i.id, i])), [ings.data]);
  const catalog = useMemo(() => (ings.data ?? []).slice().sort(byExpiryThenName), [ings.data]);
  const onRecipe = new Set(draft.lines.map((l) => l.ingredientId));
  const addLine = (id: string) => setDraft((d) => ({ ...d, lines: [...d.lines, { ingredientId: id, qty: '', unit: '', note: '' }] }));

  useEffect(() => {
    if (selected === 'new' || selected === null) { setDraft(blank()); return; }
    const r = recipes.data?.find((x) => x.id === selected);
    if (r) setDraft({ title: r.title, tags: r.tags, tagsText: r.tags.join(', '), sources: r.sources ?? [], morningSteps: r.morningSteps?.length ? r.morningSteps : [''], steps: r.steps.length ? r.steps : [''], ingredients: [], lines: r.ingredients.map((l) => ({ ingredientId: l.ingredientId, qty: l.qty?.toString() ?? '', unit: l.unit ?? '', note: l.note ?? '' })) });
  }, [selected, recipes.data]);

  const allTags = useMemo(() => [...new Set((recipes.data ?? []).flatMap((r) => r.tags.map((t) => t.toLowerCase())))].sort(), [recipes.data]);
  const filtered = (recipes.data ?? []).filter((r) => r.title.toLowerCase().includes(search.toLowerCase()) && (!tag || r.tags.some((t) => t.toLowerCase() === tag)));
  const setLine = (i: number, patch: Partial<LineDraft>) => setDraft((d) => ({ ...d, lines: d.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));

  async function save() {
    setBusy(true); setError(null);
    const body: RecipeInput = {
      title: draft.title.trim(), tags: draft.tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      morningSteps: draft.morningSteps.map((s) => s.trim()).filter(Boolean), sources: draft.sources.map((s) => s.trim()).filter(Boolean), steps: draft.steps.map((s) => s.trim()).filter(Boolean),
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

  return (
    <div className="page">
      <div className="page-head"><div className="col" style={{ gap: 4 }}><span className="eyebrow">Recipes</span><h1>{recipes.data?.length ?? 0} in the book</h1></div>
        <button className="btn primary" onClick={() => setSelected('new')}><Plus size={14} />New recipe</button></div>
      <div className="split">
        <div className="card"><div style={{ padding: 12 }}><input className="input" placeholder="Search recipes" value={search} onChange={(e) => setSearch(e.target.value)} />
            {allTags.length > 0 && <div className="seg" style={{ flexWrap: 'wrap', marginTop: 10 }}>{allTags.map((t) => <button key={t} className={tag === t ? 'on' : ''} style={{ padding: '4px 11px', fontSize: 12.5 }} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>{t}</button>)}</div>}</div>
          <div className="col" style={{ gap: 2, padding: '0 8px 8px' }}>
            {filtered.length === 0 && <div className="empty">{recipes.data?.length ? 'No recipes match.' : 'No recipes yet.'}</div>}
            {filtered.map((r) => <div key={r.id} className={'list-item' + (selected === r.id ? ' on' : '')} onClick={() => setSelected(r.id)}><span>{r.title}</span><small>{r.ingredients.length}</small></div>)}
          </div></div>

        {!editing ? <div className="card"><div className="empty">Pick a recipe on the left, or start a new one.</div></div> : (
          <div className="editor">
            <div className="card"><div className="card-body">
              <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
                <div className="field" style={{ flex: 2 }}><label htmlFor="r-title">Title</label><input id="r-title" className="input title-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Pav Bhaji" /></div>
                <div className="field" style={{ flex: 1 }}><label htmlFor="r-tags">Tags <span className="faint">(comma separated)</span></label><input id="r-tags" className="input tags-input" value={draft.tagsText} onChange={(e) => setDraft({ ...draft, tagsText: e.target.value })} placeholder="veg, weeknight" /></div>
              </div>
              <span className="note-line">Amounts are for one meal, two people. Dinner doubles them; the household count scales the rest.</span>
            </div></div>

            {selected === 'new' && <RecipeChat title={draft.title} />}

            <div className="card">
              <CardHead title="Ingredients" count={`${draft.lines.length} line${draft.lines.length === 1 ? '' : 's'}`} />
              {draft.lines.length > 0 && <div className="lines head"><span>Qty</span><span>Unit</span><span>Ingredient</span><span>Note</span><span /></div>}
              {draft.lines.map((l, i) => { const ing: Ingredient | undefined = byId[l.ingredientId]; const pantry = ing?.kind === 'pantry'; return (
                <div key={i} className="lines" style={pantry ? { background: '#fdfcfa' } : undefined}>
                  <input aria-label="quantity" className="input mono small" type="number" min="0" step="any" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
                  <select aria-label="unit" className="select" style={{ padding: '6px 8px' }} value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value as Unit | '' })}><option value="">—</option>{unitsFor(ing).map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}</select>
                  <div className="row"><select aria-label="ingredient" className="select" style={{ padding: '6px 8px' }} value={l.ingredientId} onChange={(e) => { if (e.target.value === '__new') setNewIng(i); else setLine(i, { ingredientId: e.target.value, unit: '' }); }}>
                    <option value="">choose…</option>{(ings.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}<option value="__new">+ New ingredient…</option></select>
                    {ing && <span className={'chip ' + ing.kind}>{ing.kind}</span>}</div>
                  <input aria-label="note" className="input small" placeholder={pantry ? 'not counted — bought when low' : 'finely chopped'} value={l.note} onChange={(e) => setLine(i, { note: e.target.value })} />
                  <button className="icon-btn remove" aria-label="remove line" onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, j) => j !== i) })}><X size={12} /></button>
                </div>); })}
              <button className="add-row" onClick={() => setDraft({ ...draft, lines: [...draft.lines, { ingredientId: '', qty: '', unit: '', note: '' }] })}><Plus size={14} />Add an ingredient</button>
            </div>

            <StepsCard title="Morning" hint="Hours ahead — soak, thaw, set the curd. Leave empty if there is nothing." placeholder="Soak the chana." steps={draft.morningSteps} onChange={(morningSteps) => setDraft((d) => ({ ...d, morningSteps }))} />
            <StepsCard title="Evening" hint="The cooking itself." placeholder="Boil the potatoes until soft." steps={draft.steps} onChange={(steps) => setDraft((d) => ({ ...d, steps }))} />
            <SourcesCard sources={draft.sources} onChange={(sources) => setDraft((d) => ({ ...d, sources }))} />

            {error && <div className="banner red">{error}</div>}
            <div className="save-bar">
              {selected !== 'new' && <button className="btn danger" onClick={remove}>Delete recipe</button>}
              <div className="spacer" /><button className="btn" onClick={() => setSelected(null)}>Discard</button>
              <button className="btn primary" disabled={busy || !draft.title.trim()} onClick={save}>{busy ? 'Saving…' : 'Save recipe'}</button>
            </div>

            {selected === 'new' && (
              <div className="card">
                <CardHead title="Everything this house buys" hint="Add one with +, then set its amount above. Anything missing needs + New ingredient first." count={`${catalog.length} ingredient${catalog.length === 1 ? '' : 's'}`} />
                <IngredientTable
                  rows={catalog} stores={stores.data ?? []} empty="No ingredients yet — add one from the picker above."
                  extra={[{ head: '', cell: (i) => onRecipe.has(i.id)
                    ? <span className="row" style={{ justifyContent: 'flex-end', gap: 5, fontSize: 12.5, color: 'var(--green-ink)' }}><Check size={13} />added</span>
                    : <button className="btn small" aria-label={`add ${i.name}`} title={`Add ${i.name} to this recipe`} onClick={() => addLine(i.id)}><Plus size={13} /></button> }]}
                />
              </div>)}
          </div>)}
      </div>
      {newIng !== null && <IngredientDialog stores={stores.data ?? []} onClose={() => setNewIng(null)} onSaved={(ing) => { qc.invalidateQueries({ queryKey: keys.ingredients }); setLine(newIng, { ingredientId: ing.id, unit: '' }); setNewIng(null); }} />}
    </div>
  );
}
