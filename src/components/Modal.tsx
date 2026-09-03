import type { ReactNode } from 'react';
export function Modal({ title, eyebrow, children, footer, onClose, width }: { title: ReactNode; eyebrow?: ReactNode; children: ReactNode; footer?: ReactNode; onClose: () => void; width?: number }) {
  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" style={width ? { width } : undefined}>
        <div className="modal-head">{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
