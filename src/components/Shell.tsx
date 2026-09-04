import { NavLink, Outlet } from 'react-router-dom';
import { Stepper } from './Stepper';
import { useSettings, useUpdateSettings } from '../lib/hooks';

const LINKS = [['/plan', 'Plan'], ['/today', 'Today'], ['/ekadashi', 'Ekadashi'], ['/recipes', 'Recipes'], ['/ingredients', 'Ingredients'], ['/list', 'Lists']] as const;
export function Shell() {
  const settings = useSettings(); const update = useUpdateSettings();
  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Home Kitchen</span>
        <nav>{LINKS.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}>{label}</NavLink>)}</nav>
        <div className="spacer" />
        <div className="pill" title="Recipes are written for two; everything scales by people ÷ 2">
          <span className="muted">Cooking for</span>
          <Stepper value={settings.data?.people ?? 2} onChange={(people) => update.mutate({ people })} />
        </div>
      </header>
      <Outlet />
    </div>
  );
}
