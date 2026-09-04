import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from './api';
import { isValidDate, todayStr } from './dates';

export function useDateParam(): [string, (d: string) => void] {
  const [sp, setSp] = useSearchParams();
  const raw = sp.get('date');
  const date = isValidDate(raw) ? raw : todayStr();
  return [date, (d) => setSp({ date: d })];
}

export const keys = {
  settings: ['settings'] as const, stores: ['stores'] as const, ingredients: ['ingredients'] as const, recipes: ['recipes'] as const,
  needsBridge: ['needs-bridge'] as const, week: (d: string) => ['week', d] as const, needed: (d: string) => ['needed', d] as const,
  list: (d: string) => ['list', d] as const, today: (d: string) => ['today', d] as const, ekadashi: ['ekadashi'] as const,
};

export const useSettings = () => useQuery({ queryKey: keys.settings, queryFn: api.settings.get });
export const useStores = () => useQuery({ queryKey: keys.stores, queryFn: api.stores.list });
export const useIngredients = () => useQuery({ queryKey: keys.ingredients, queryFn: api.ingredients.list });
export const useRecipes = () => useQuery({ queryKey: keys.recipes, queryFn: api.recipes.list });
export const useNeedsBridge = () => useQuery({ queryKey: keys.needsBridge, queryFn: api.ingredients.needsBridge });
export const useWeek = (date: string) => useQuery({ queryKey: keys.week(date), queryFn: () => api.plan.week(date) });
export const useNeeded = (date: string) => useQuery({ queryKey: keys.needed(date), queryFn: () => api.freshStock.needed(date) });
export const useList = (date: string) => useQuery({ queryKey: keys.list(date), queryFn: () => api.lists.forWeek(date) });
export const useToday = (date: string) => useQuery({ queryKey: keys.today(date), queryFn: () => api.today(date) });
export const useEkadashi = () => useQuery({ queryKey: keys.ekadashi, queryFn: () => api.ekadashi.list() });

/** Anything that changes the catalog or plan invalidates everything derived from it. */
export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}
export function useUpdateSettings() {
  const inv = useInvalidateAll();
  return useMutation({ mutationFn: api.settings.update, onSuccess: inv });
}
/** A fast day moves which evening cooks what, so the week and today are both stale afterwards (§4). */
export function useMarkEkadashi() {
  const inv = useInvalidateAll();
  return useMutation({ mutationFn: ({ date, name }: { date: string; name?: string }) => api.ekadashi.mark(date, name), onSuccess: inv });
}
export function useUnmarkEkadashi() {
  const inv = useInvalidateAll();
  return useMutation({ mutationFn: (date: string) => api.ekadashi.unmark(date), onSuccess: inv });
}
