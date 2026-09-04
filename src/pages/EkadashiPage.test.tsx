import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '../lib/api';
import { EkadashiPage } from './EkadashiPage';
import { PlanPage } from './PlanPage';
import { TodayPage } from './TodayPage';
import type { Today, Week, WeekDay } from '../lib/types';

const day = (date: string, o: Partial<WeekDay> = {}): WeekDay => ({ date, isEkadashi: false, breakfast: [], lunch: [], lunchFrom: null, dinner: [], dinnerCookedOn: date, cookAhead: null, ...o });
// Sun 6 Sep 2026 – Sat 12 Sep. Mon's Palak Paneer skips Tuesday's fast and lands on Wednesday's lunch (§4).
const week: Week = {
  startDate: '2026-09-06', endDate: '2026-09-12',
  days: [
    day('2026-09-06', { lunch: [{ id: 'r0', title: 'Khichdi' }], lunchFrom: '2026-09-05' }),
    day('2026-09-07', { dinner: [{ id: 'r1', title: 'Palak Paneer' }], cookAhead: { date: '2026-09-08', dishes: [{ id: 'r2', title: 'Bateta Bhaji' }] } }),
    day('2026-09-08', { isEkadashi: true, dinner: [{ id: 'r2', title: 'Bateta Bhaji' }], lunch: [{ id: 'r2', title: 'Bateta Bhaji' }], lunchFrom: '2026-09-07', dinnerCookedOn: '2026-09-07' }),
    day('2026-09-09', { lunch: [{ id: 'r1', title: 'Palak Paneer' }], lunchFrom: '2026-09-07' }),
    day('2026-09-10'), day('2026-09-11'), day('2026-09-12'),
  ],
};
const today = (o: Partial<Today> = {}): Today => ({ date: '2026-09-07', people: 2, isEkadashi: false, breakfast: [], lunch: [], lunchFrom: null, dinner: [], dinnerCookedOn: '2026-09-07', cookAhead: null, ...o });
const dish = (recipeId: string, title: string) => ({ recipeId, title, factor: 2, lines: [], steps: [] });

const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);

describe('the fast day across the three pages', () => {
  it('ekadashi page lists marked dates with their dish', async () => {
    vi.spyOn(api.ekadashi, 'list').mockResolvedValue([{ id: 'e0', date: '2020-01-02', name: 'Old one' }, { id: 'e1', date: '2026-09-08', name: 'Parivartini' }]);
    vi.spyOn(api.plan, 'week').mockResolvedValue(week);
    wrap(<EkadashiPage />);
    expect(await screen.findByText('Parivartini')).toBeInTheDocument();
    expect(await screen.findByText('Bateta Bhaji')).toBeInTheDocument();
    expect(screen.getByText(/cooked Monday evening/)).toBeInTheDocument();
    expect(screen.getByText('Already passed')).toBeInTheDocument();
    expect(screen.getByText('September 2026')).toBeInTheDocument();
  });
  it('ekadashi page marks a date with its name, and unmarks one', async () => {
    vi.spyOn(api.ekadashi, 'list').mockResolvedValue([{ id: 'e1', date: '2026-09-08', name: 'Parivartini' }]);
    vi.spyOn(api.plan, 'week').mockResolvedValue(week);
    const mark = vi.spyOn(api.ekadashi, 'mark').mockResolvedValue({ id: 'e2', date: '2026-09-22', name: 'Indira' });
    const unmark = vi.spyOn(api.ekadashi, 'unmark').mockResolvedValue(undefined);
    wrap(<EkadashiPage />);
    await screen.findByText('Parivartini');
    await userEvent.clear(screen.getByLabelText('name'));
    await userEvent.type(screen.getByLabelText('name'), 'Indira');
    await userEvent.click(screen.getByRole('button', { name: /Mark as Ekadashi/ }));
    await waitFor(() => expect(mark).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 'Indira'));
    await userEvent.click(screen.getByLabelText('unmark 2026-09-08'));
    await waitFor(() => expect(unmark).toHaveBeenCalledWith('2026-09-08'));
  });
  it('ekadashi page says so when nothing is marked', async () => {
    vi.spyOn(api.ekadashi, 'list').mockResolvedValue([]);
    wrap(<EkadashiPage />);
    expect(await screen.findByText('No days marked yet.')).toBeInTheDocument();
  });
  it('plan grid marks the fast day, the cook-ahead, and the lunch that skipped it', async () => {
    vi.spyOn(api.plan, 'week').mockResolvedValue(week);
    vi.spyOn(api.recipes, 'list').mockResolvedValue([]);
    vi.spyOn(api.settings, 'get').mockResolvedValue({ people: 2, weekStartsOn: 0 });
    vi.spyOn(api.ingredients, 'needsBridge').mockResolvedValue([]);
    vi.spyOn(api.ingredients, 'list').mockResolvedValue([]);
    wrap(<PlanPage />);
    expect(await screen.findByText('Ekadashi')).toBeInTheDocument();
    expect(screen.getByText(/also cook tonight/)).toBeInTheDocument();
    expect(screen.getByText('cooked last night · lunch and dinner')).toBeInTheDocument();
    // Wednesday alone carries from Monday; the fast's own lunch says how it was made, not where it came from.
    expect(screen.getAllByText('from Mon dinner')).toHaveLength(1);
    expect(screen.getAllByText('cooked last night')).toHaveLength(1);
    expect(screen.getByText('from last Sat dinner')).toBeInTheDocument();
  });
  it('today page shows the third card, and names the night a skipped-over lunch was cooked', async () => {
    vi.spyOn(api, 'today').mockResolvedValue(today({
      date: '2026-09-09', lunch: ['Palak Paneer'], lunchFrom: '2026-09-07', dinnerCookedOn: '2026-09-09',
      dinner: [dish('r3', 'Dal')], cookAhead: { date: '2026-09-10', recipes: [dish('r2', 'Bateta Bhaji')] },
    }));
    wrap(<TodayPage />);
    expect(await screen.findByText('Also cook tonight')).toBeInTheDocument();
    expect(screen.getByText(/carried over from Monday night/)).toBeInTheDocument();
    expect(screen.getByText(/×2 — tonight and the lunch after the fast/)).toBeInTheDocument();
  });
  it('today page on the fast itself says the pot was made last night', async () => {
    vi.spyOn(api, 'today').mockResolvedValue(today({
      date: '2026-09-08', isEkadashi: true, lunch: ['Bateta Bhaji'], lunchFrom: '2026-09-07',
      dinner: [dish('r2', 'Bateta Bhaji')], dinnerCookedOn: '2026-09-07',
    }));
    wrap(<TodayPage />);
    expect(await screen.findByText('Ekadashi')).toBeInTheDocument();
    expect(screen.getByText(/cooked last night — the same dish at lunch and dinner/)).toBeInTheDocument();
    expect(screen.getByText(/the fast’s own dish, cooked last night/)).toBeInTheDocument();
  });
});
