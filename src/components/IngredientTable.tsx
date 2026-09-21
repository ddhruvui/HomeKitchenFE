import { useState, type ReactNode } from 'react';
import { UNIT_LABEL } from '../lib/format';
import { expiryLabel, expiryStatus } from '../lib/dates';
import type { Ingredient, IngredientKind, Store } from '../lib/types';

export const KIND_LABEL: Record<IngredientKind, string> = { fresh: 'Fresh', weekly: 'Weekly', pantry: 'Pantry' };

/** The one line that explains how an ingredient reaches the shopping list. */
export function counted(i: Ingredient): ReactNode {
  if (i.kind === 'pantry') return <span className="serif faint" style={{ fontStyle: 'italic' }}>no quantity — marked low</span>;
  if (i.kind === 'weekly') return `${i.weeklyQty} every week`;
  const parts = [i.buyUnit ? `by ${UNIT_LABEL[i.buyUnit]}` : ''];
  if (i.ozPerCount && i.countUnit) parts.push(`${i.ozPerCount} oz per ${i.countUnit}`);
  if (i.ozPerCup) parts.push(`${i.ozPerCup} oz per cup`);
  return parts.filter(Boolean).join(' · ');
}

const expiryColor = (d: string) => ({ expired: 'var(--red)', soon: 'var(--amber)', later: 'var(--muted)' })[expiryStatus(d).status];

/** A right-aligned column the host page appends — the row actions on Ingredients, nothing on Recipes. */
export interface IngredientColumn { head: ReactNode; cell: (i: Ingredient) => ReactNode }

/** The catalog as a table, searchable by name. Rows arrive already filtered and sorted by the page that owns them. */
export function IngredientTable({ rows, stores, extra = [], expiryNote, empty = 'Nothing here yet.' }: {
  rows: Ingredient[]; stores: Store[]; extra?: IngredientColumn[];
  expiryNote?: (i: Ingredient) => ReactNode; empty?: string;
}) {
  const [search, setSearch] = useState('');
  const storeById = Object.fromEntries(stores.map((s) => [s.id, s]));
  const needle = search.trim().toLowerCase();
  const shown = needle ? rows.filter((i) => i.name.toLowerCase().includes(needle)) : rows;
  return (
    <>
    <div className="row" style={{ padding: '10px 20px', borderBottom: '1px solid var(--rule)', gap: 10 }}>
      <input className="input small" aria-label="search ingredients" placeholder="Search ingredients" value={search} onChange={(e) => setSearch(e.target.value)} />
      {needle !== '' && <span className="mono faint" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{shown.length} of {rows.length}</span>}
    </div>
    <table className="table">
      <thead><tr><th>Name</th><th>Kind</th><th>Store</th><th>How it’s counted</th><th>Expires</th>{extra.map((c, k) => <th key={k} className="num">{c.head}</th>)}</tr></thead>
      <tbody>
        {shown.length === 0 && <tr><td colSpan={5 + extra.length} className="empty">{needle ? `Nothing matches “${search.trim()}”.` : empty}</td></tr>}
        {shown.map((i) => (
          <tr key={i.id}>
            <td className="name">{i.name}</td>
            <td><span className={'chip ' + i.kind}>{KIND_LABEL[i.kind]}</span></td>
            <td><span className="row" style={{ gap: 8 }}><span className="dot" style={{ background: storeById[i.storeId]?.color ?? '#ccc' }} />{storeById[i.storeId]?.name ?? '—'}</span></td>
            <td className="muted" style={{ fontSize: 13 }}>{counted(i)}</td>
            <td style={{ fontSize: 12.5 }}>{i.expiresOn ? <div className="col" style={{ gap: 2 }}><span style={{ color: expiryColor(i.expiresOn), fontWeight: expiryStatus(i.expiresOn).status === 'later' ? 400 : 600, whiteSpace: 'nowrap' }}><span className="mono">{i.expiresOn}</span> · {expiryLabel(i.expiresOn)}</span>{expiryNote?.(i)}</div> : <span className="faint">—</span>}</td>
            {extra.map((c, k) => <td key={k} className="num">{c.cell(i)}</td>)}
          </tr>))}
      </tbody>
    </table>
    </>
  );
}
