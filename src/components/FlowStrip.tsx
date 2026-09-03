import { Link } from 'react-router-dom';
import { Check } from './Icons';
const STEPS = [['Plan the week', '/plan'], ['Check the kitchen', '/fridge'], ['Shopping list', '/list']] as const;
export function FlowStrip({ current, date }: { current: 1 | 2 | 3; date: string }) {
  return (
    <div className="flow">
      {STEPS.map(([label, to], i) => {
        const n = i + 1; const cls = n < current ? 'done' : n === current ? 'current' : '';
        return (
          <Link key={to} to={`${to}?date=${date}`} className={`flow-step ${cls}`}>
            <span className="flow-num">{n < current ? <Check size={11} /> : n}</span><span>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
