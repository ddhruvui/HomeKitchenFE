import { useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import type { ChatTurn } from '../lib/types';

/** A conversation about the dish, beside the editor. Nothing it says reaches the recipe except by your typing it in,
 *  and nothing is stored: the turns live in this component and go up whole on every question. */
export function RecipeChat({ title }: { title: string }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const thread = useRef<HTMLDivElement>(null);

  // A new answer is always at the bottom, and it is the thing you want to read.
  useEffect(() => { const el = thread.current; if (el) el.scrollTop = el.scrollHeight; }, [turns, busy]);

  async function ask(conversation: ChatTurn[]) {
    setBusy(true); setError(null);
    try {
      const { reply } = await api.ai.chat(conversation);
      setTurns([...conversation, { role: 'model', text: reply }]);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  function send() {
    const q = text.trim();
    if (!q || busy) return;
    const next: ChatTurn[] = [...turns, { role: 'user', text: q }];
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
              <span className="mono faint" style={{ fontSize: 10.5, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{t.role === 'user' ? 'You' : 'Gemini'}</span>
              <div style={{
                maxWidth: '86%', padding: '9px 13px', borderRadius: 10, whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.55,
                background: t.role === 'user' ? 'var(--soft)' : 'var(--paper)',
                border: t.role === 'user' ? 'none' : '1px solid var(--rule-soft)',
                fontFamily: t.role === 'user' ? 'var(--sans)' : 'var(--serif)',
              }}>{t.text}</div>
            </div>))}
          {busy && <span className="faint" style={{ fontSize: 12.5 }}>Asking Gemini…</span>}
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
