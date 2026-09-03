import { Minus, Plus } from './Icons';
export function Stepper({ value, min = 1, max = 12, onChange }: { value: number; min?: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="fewer" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}><Minus size={12} /></button>
      <span>{value}</span>
      <button type="button" aria-label="more" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}><Plus size={12} /></button>
    </div>
  );
}
