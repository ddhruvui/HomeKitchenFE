import { useState } from 'react';
import { Modal } from './Modal';
import { api, errorMessage, type IngredientInput } from '../lib/api';
import { COUNT_UNITS, UNIT_LABEL, VOLUME_UNITS, WEIGHT_UNITS } from '../lib/format';
import type { CountUnit, Form, Ingredient, IngredientKind, Store, Unit } from '../lib/types';
import { FORMS } from '../lib/types';

const KINDS: Array<[IngredientKind, string, string]> = [
  ['fresh', 'Fresh', 'Bought in the amount the week’s recipes need'],
  ['weekly', 'Weekly', 'The same amount every week, recipes or not'],
  ['pantry', 'Pantry', 'Bought in bulk, only when you mark it low'],
];
const ALL: Unit[] = [...WEIGHT_UNITS, ...VOLUME_UNITS, ...COUNT_UNITS];

export function IngredientDialog({ stores, initial, onClose, onSaved }: { stores: Store[]; initial?: Ingredient; onClose: () => void; onSaved: (i: Ingredient) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<IngredientKind>(initial?.kind ?? 'pantry');
  const [storeId, setStoreId] = useState(initial?.storeId ?? stores[0]?.id ?? '');
  const [form, setForm] = useState<Form>(initial?.form ?? 'Produce');
  const [weeklyQty, setWeeklyQty] = useState(initial?.weeklyQty?.toString() ?? '1');
  const [buyUnit, setBuyUnit] = useState<Unit>(initial?.buyUnit ?? 'each');
  const [stockUnit, setStockUnit] = useState<Unit | ''>(initial?.stockUnit ?? '');
  const [countUnit, setCountUnit] = useState<CountUnit | ''>(initial?.countUnit ?? (initial?.buyUnit && COUNT_UNITS.includes(initial.buyUnit as CountUnit) ? initial.buyUnit as CountUnit : ''));
  const [ozPerCup, setOzPerCup] = useState(initial?.ozPerCup?.toString() ?? '');
  const [ozPerCount, setOzPerCount] = useState(initial?.ozPerCount?.toString() ?? '');
  const [expiresOn, setExpiresOn] = useState(initial?.expiresOn ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
  async function save() {
    setBusy(true); setError(null);
    const body: IngredientInput = { name: name.trim(), kind, storeId, form };
    if (kind === 'weekly') body.weeklyQty = num(weeklyQty);
    if (kind === 'pantry') { if (expiresOn.trim()) body.expiresOn = expiresOn.trim(); else if (initial?.expiresOn) body.expiresOn = null; }
    if (kind === 'fresh') {
      body.buyUnit = buyUnit; body.stockUnit = stockUnit || buyUnit;
      const cu = countUnit || (COUNT_UNITS.includes(buyUnit as CountUnit) ? (buyUnit as CountUnit) : undefined);
      if (cu) body.countUnit = cu;
      if (num(ozPerCup)) body.ozPerCup = num(ozPerCup);
      if (num(ozPerCount)) body.ozPerCount = num(ozPerCount);
    }
    try { onSaved(initial ? await api.ingredients.update(initial.id, body) : await api.ingredients.create(body)); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  const unitSelect = (value: string, set: (u: Unit) => void, opts: Unit[], id: string) => (
    <select id={id} className="select" value={value} onChange={(e) => set(e.target.value as Unit)}>{opts.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}</select>
  );

  return (
    <Modal title={initial ? 'Edit ingredient' : 'New ingredient'} onClose={onClose} footer={<>
      <div className="spacer" />
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn primary" disabled={busy || !name.trim() || !storeId} onClick={save}>{initial ? 'Save' : 'Add ingredient'}</button>
    </>}>
      <div className="field"><label htmlFor="ing-name">Name</label><input id="ing-name" className="input serif" style={{ fontSize: 17 }} value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'pantry' ? 'Basmati Rice' : kind === 'weekly' ? 'Milk' : 'Yellow Onion'} autoFocus /></div>
      <div className="field"><label>What kind is it?</label>
        <div className="kinds">{KINDS.map(([k, t, d]) => <button type="button" key={k} className={'kind' + (kind === k ? ' on' : '')} onClick={() => setKind(k)} aria-pressed={kind === k}><b>{t}</b><small>{d}</small></button>)}</div>
      </div>
      <div className="field"><label>Where do you buy it?</label>
        {stores.length === 0 ? <span className="err">Add a store first.</span> :
          <div className="chips">{stores.map((s) => <button type="button" key={s.id} className={'storechip' + (storeId === s.id ? ' on' : '')} onClick={() => setStoreId(s.id)}><span className="dot" style={{ background: s.color }} />{s.name}</button>)}</div>}
      </div>
      <div className="field"><label htmlFor="ing-form">Aisle</label><select id="ing-form" className="select" value={form} onChange={(e) => setForm(e.target.value as Form)}>{FORMS.map((f) => <option key={f}>{f}</option>)}</select></div>

      {kind === 'pantry' && <>
        <div className="banner amber" style={{ display: 'block' }}><b>No quantity needed.</b> A pantry item never gets a computed amount. It goes on a list only when someone marks it low, and comes off when it is checked in the store.</div>
        <div className="field" style={{ maxWidth: 220 }}><label htmlFor="ing-expires">Expires on <span className="faint">(optional)</span></label><input id="ing-expires" className="input mono" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} /></div>
      </>}
      {kind === 'weekly' && <div className="field"><label htmlFor="ing-weekly">How many every week, for two people</label><input id="ing-weekly" className="input mono" type="number" min="0" step="1" value={weeklyQty} onChange={(e) => setWeeklyQty(e.target.value)} /></div>}
      {kind === 'fresh' && <>
        <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <div className="field" style={{ flex: 1 }}><label htmlFor="ing-buy">Bought by</label>{unitSelect(buyUnit, (u) => { setBuyUnit(u); if (COUNT_UNITS.includes(u as CountUnit)) setCountUnit(u as CountUnit); }, ALL, 'ing-buy')}</div>
          <div className="field" style={{ flex: 1 }}><label htmlFor="ing-stock">Counted in the fridge as</label>
            <select id="ing-stock" className="select" value={stockUnit} onChange={(e) => setStockUnit(e.target.value as Unit | '')}><option value="">same as bought</option>{ALL.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}</select></div>
          <div className="field" style={{ flex: 1 }}><label htmlFor="ing-count">Count unit</label>
            <select id="ing-count" className="select" value={countUnit} onChange={(e) => setCountUnit(e.target.value as CountUnit | '')}><option value="">none</option>{COUNT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
        </div>
        <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <div className="field" style={{ flex: 1 }}><label htmlFor="ing-cup">oz per cup <span className="faint">(volume ↔ weight)</span></label><input id="ing-cup" className="input mono" type="number" min="0" step="0.1" value={ozPerCup} onChange={(e) => setOzPerCup(e.target.value)} placeholder="leave blank to estimate later" /></div>
          <div className="field" style={{ flex: 1 }}><label htmlFor="ing-each">oz per {countUnit || 'count'} <span className="faint">(count ↔ weight)</span></label><input id="ing-each" className="input mono" type="number" min="0" step="0.1" value={ozPerCount} onChange={(e) => setOzPerCount(e.target.value)} placeholder="leave blank to estimate later" /></div>
        </div>
      </>}
      {error && <div className="err">{error}</div>}
    </Modal>
  );
}
