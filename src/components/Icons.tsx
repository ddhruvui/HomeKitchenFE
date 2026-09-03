type P = { size?: number; stroke?: number };
const S = ({ size = 16, stroke = 1.6, children }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
export const Plus = (p: P) => <S {...p}><path d="M8 3.5v9M3.5 8h9" /></S>;
export const Minus = (p: P) => <S {...p}><path d="M3.5 8h9" /></S>;
export const X = (p: P) => <S {...p}><path d="M4 4l8 8M12 4l-8 8" /></S>;
export const Check = (p: P) => <S {...p} stroke={p.stroke ?? 2.2}><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></S>;
export const Left = (p: P) => <S {...p}><path d="M10 3.5 5.5 8l4.5 4.5" /></S>;
export const Right = (p: P) => <S {...p}><path d="M6 3.5 10.5 8 6 12.5" /></S>;
export const Warn = (p: P) => <S {...p} stroke={1.5}><path d="M8 2.5 14.5 13.5h-13z" /><path d="M8 6.4v3.2" /><circle cx="8" cy="11.6" r="0.55" fill="currentColor" stroke="none" /></S>;
export const Carry = (p: P) => <S {...p} stroke={1.7}><path d="M3 8a5 5 0 0 1 8.5-3.5M13 8a5 5 0 0 1-8.5 3.5" /><path d="M11.5 1.8v2.9h-2.9M4.5 14.2v-2.9h2.9" /></S>;
export const Copy = (p: P) => <S {...p}><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" /></S>;
export const Up = (p: P) => <S {...p}><path d="M3.5 10 8 5.5l4.5 4.5" /></S>;
export const Down = (p: P) => <S {...p}><path d="M3.5 6 8 10.5 12.5 6" /></S>;
