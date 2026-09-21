import { useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import type { ChatTurn } from '../lib/types';

/** What answered is display-only: the backend's fallback chain means it varies per turn, and only role and text go back up. */
type Turn = ChatTurn & { model?: string };

/** Openers, in the order the recipe gets written: what to buy, then how to cook it, then the two things you ask afterwards.
 *  Static rather than model-written — the free tier is 20 requests a day, and a chip is not worth one of them. */
const SUGGESTIONS = (dish: string) => [
  `What do I need for ${dish}?`,
  `How do I make ${dish}?`,
  'How long does it take?',
  'Can I make any of it ahead?',
];

/** A conversation about the dish, beside the editor. Nothing it says reaches the recipe except by your typing it in,
 *  and nothing is stored: the turns live in this component and go up whole on every question. */
export function RecipeChat({ title }: { title: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const thread = useRef<HTMLDivElement>(null);

  // A new answer is always at the bottom, and it is the thing you want to read.
  useEffect(() => { const el = thread.current; if (el) el.scrollTop = el.scrollHeight; }, [turns, busy]);

  async function ask(conversation: Turn[]) {
    setBusy(true); setError(null);
    try {
      const { reply, model } = await api.ai.chat(conversation.map(({ role, text: t }) => ({ role, text: t })));
      setTurns([...conversation, { role: 'model', text: reply, model }]);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  function send() {
    const q = text.trim();
    if (q) ask1(q);
  }

  const dish = title.trim() || 'pav bhaji';
  const asked = new Set(turns.filter((t) => t.role === 'user').map((t) => t.text));
  const suggestions = SUGGESTIONS(dish).filter((q) => !asked.has(q)).slice(0, 3);

  function ask1(question: string) {
    if (busy) return;
    const next: Turn[] = [...turns, { role: 'user', text: question }];
    setTurns(next); setText(''); ask(next);
  }

  return (
    <div className="card">
      <div className="card-head">
        <span className="serif" style={{ fontSize: 19, flexGrow: 1 }}>Ask about the dish</span>
        {turns.length > 0 && <button className="btn small" onClick={() => { setTurns([]); setError(null); }}>Start over</button>}
      </div>
      <div className="row" style={{ padding: '10px 20px 0' }}>
        <span className="serif faint" style={{ fontStyle: 'italic', fontSize: 12.5 }}>
          Gemini answers in this house's units, for two people, using your catalog's names where it can. Nothing it says is written down — copy what you want into the recipe above.
        </span>
      </div>

      {turns.length > 0 && (
        <div ref={thread} className="col" style={{ gap: 12, padding: '14px 20px', maxHeight: 380, overflowY: 'auto' }}>
          {turns.map((t, i) => (
            <div key={i} className="col" style={{ gap: 3, alignItems: t.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <span className="mono faint" style={{ fontSize: 10.5, letterSpacing: '0.07em' }}>
                {t.role === 'user' ? 'YOU' : t.model ? `GEMINI · ${t.model}` : 'GEMINI'}
              </span>
              <div style={{
                maxWidth: '86%', padding: '9px 13px', borderRadius: 10, whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.55,
                background: t.role === 'user' ? 'var(--soft)' : 'var(--paper)',
                border: t.role === 'user' ? 'none' : '1px solid var(--rule-soft)',
                fontFamily: t.role === 'user' ? 'var(--sans)' : 'var(--serif)',
              }}>{t.text}</div>
            </div>))}
          {busy && <span className="faint" style={{ fontSize: 12.5 }}>Asking Gemini…</span>}
        </div>)}

      {suggestions.length > 0 && !busy && (
        <div className="row" style={{ padding: '12px 20px 0', gap: 8, flexWrap: 'wrap' }}>
          {suggestions.map((q) => (
            <button key={q} className="btn small" style={{ borderRadius: 999, fontWeight: 400 }} onClick={() => ask1(q)}>{q}</button>
          ))}
        </div>)}

      {error && (
        <div className="row" style={{ padding: '0 20px 10px', gap: 10 }}>
          <span className="err" style={{ flexGrow: 1 }}>{error}</span>
          {turns.length > 0 && turns[turns.length - 1].role === 'user' && <button className="btn small" disabled={busy} onClick={() => ask(turns)}>Retry</button>}
        </div>)}

      <div className="row" style={{ padding: '10px 20px 14px', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          aria-label="ask about the dish" className="textarea" rows={2} style={{ resize: 'vertical', minHeight: 44 }}
          placeholder={turns.length ? 'Ask a follow-up…' : `How do I make ${title.trim() || 'pav bhaji'}?`}
          value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button className="btn primary" style={{ whiteSpace: 'nowrap' }} disabled={busy || !text.trim()} onClick={send}>{busy ? 'Asking…' : 'Ask'}</button>
      </div>
    </div>
  );
}
