import type { BridgeEstimate, EkadashiDay, Ingredient, Needed, NeedsBridge, Recipe, RecipeDraft, Settings, ShoppingList, Store, Today, Week, Unit } from './types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly details?: unknown) { super(message); this.name = 'ApiError'; }
}

async function http<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs, ...rest } = init;
  const signal = timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined;
  let r: Response;
  try { r = await fetch(BASE + path, { ...rest, signal, headers: { 'content-type': 'application/json', ...(rest.headers ?? {}) } }); }
  catch (e) { throw new ApiError(0, (e as Error)?.name === 'TimeoutError' ? 'That took too long — the model may be busy. Try again.' : 'Could not reach the server.'); }
  if (r.status === 204) return undefined as T;
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, (body as { error?: string }).error ?? `request failed (${r.status})`, (body as { details?: unknown }).details);
  return body as T;
}
const j = (body: unknown) => JSON.stringify(body);
const qs = (params: Record<string, string | undefined>) => { const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString(); return q ? `?${q}` : ''; };

export type IngredientInput = Omit<Ingredient, 'id' | 'isLow' | 'expiresOn'> & { expiresOn?: string | null };
export type RecipeInput = Omit<Recipe, 'id'>;

export const api = {
  settings: {
    get: () => http<Settings>('/api/settings'),
    update: (body: Partial<Settings>) => http<Settings>('/api/settings', { method: 'PUT', body: j(body) }),
  },
  stores: {
    list: () => http<Store[]>('/api/stores'),
    create: (body: { name: string; color?: string; sortOrder?: number }) => http<Store>('/api/stores', { method: 'POST', body: j(body) }),
    update: (id: string, body: Partial<Omit<Store, 'id'>>) => http<Store>(`/api/stores/${id}`, { method: 'PUT', body: j(body) }),
    remove: (id: string) => http<void>(`/api/stores/${id}`, { method: 'DELETE' }),
  },
  ingredients: {
    list: () => http<Ingredient[]>('/api/ingredients'),
    create: (body: IngredientInput) => http<Ingredient>('/api/ingredients', { method: 'POST', body: j(body) }),
    update: (id: string, body: IngredientInput) => http<Ingredient>(`/api/ingredients/${id}`, { method: 'PUT', body: j(body) }),
    remove: (id: string) => http<void>(`/api/ingredients/${id}`, { method: 'DELETE' }),
    setLow: (id: string, isLow: boolean) => http<Ingredient>(`/api/ingredients/${id}/low`, { method: 'PATCH', body: j({ isLow }) }),
    setBridges: (id: string, body: { ozPerCup?: number; ozPerCount?: number }) => http<Ingredient>(`/api/ingredients/${id}/bridges`, { method: 'PATCH', body: j(body) }),
    needsBridge: () => http<NeedsBridge[]>('/api/ingredients/needs-bridge'),
  },
  recipes: {
    list: () => http<Recipe[]>('/api/recipes'),
    create: (body: RecipeInput) => http<Recipe>('/api/recipes', { method: 'POST', body: j(body) }),
    update: (id: string, body: RecipeInput) => http<Recipe>(`/api/recipes/${id}`, { method: 'PUT', body: j(body) }),
    remove: (id: string) => http<void>(`/api/recipes/${id}`, { method: 'DELETE' }),
  },
  plan: {
    week: (date: string) => http<Week>(`/api/plan/week?date=${date}`),
    setDay: (date: string, body: { breakfast: string[]; dinner: string[] }) => http<unknown>(`/api/plan/${date}`, { method: 'PUT', body: j(body) }),
    copy: (fromDate: string, toDate: string) => http<{ daysCopied: number }>('/api/plan/copy', { method: 'POST', body: j({ fromDate, toDate }) }),
  },
  freshStock: {
    needed: (date: string) => http<Needed>(`/api/fresh-stock/needed?date=${date}`),
    replace: (entries: Array<{ ingredientId: string; qty: number; unit: Unit }>) => http<unknown>('/api/fresh-stock', { method: 'PUT', body: j(entries) }),
  },
  lists: {
    forWeek: async (date: string): Promise<ShoppingList | null> => {
      try { return await http<ShoppingList>(`/api/lists?date=${date}`); }
      catch (e) { if (e instanceof ApiError && e.status === 404) return null; throw e; }
    },
    generate: (date: string) => http<ShoppingList>('/api/lists/generate', { method: 'POST', body: j({ date }) }),
    check: (listId: string, ingredientId: string, checked: boolean) => http<ShoppingList>(`/api/lists/${listId}/items/${ingredientId}`, { method: 'PATCH', body: j({ checked }) }),
    pantry: (listId: string, ingredientId: string, isLow: boolean) => http<ShoppingList>(`/api/lists/${listId}/pantry/${ingredientId}`, { method: 'PATCH', body: j({ isLow }) }),
    addManual: (listId: string, body: { name: string; storeId: string; group?: string }) => http<ShoppingList>(`/api/lists/${listId}/items`, { method: 'POST', body: j(body) }),
    removeManual: (listId: string, ingredientId: string) => http<ShoppingList>(`/api/lists/${listId}/items/${ingredientId}`, { method: 'DELETE' }),
  },
  ekadashi: {
    list: (from?: string, to?: string) => http<EkadashiDay[]>(`/api/ekadashi${qs({ from, to })}`),
    // An omitted name leaves an existing one alone; '' clears it — so send the key only when asked to.
    mark: (date: string, name?: string) => http<EkadashiDay>(`/api/ekadashi/${date}`, { method: 'PUT', body: j(name === undefined ? {} : { name }) }),
    unmark: (date: string) => http<void>(`/api/ekadashi/${date}`, { method: 'DELETE' }),
  },
  today: (date: string) => http<Today>(`/api/today?date=${date}`),
  ai: {
    bridges: (ingredientIds?: string[]) => http<{ estimates: BridgeEstimate[]; model: string }>('/api/ai/bridges', { method: 'POST', body: j(ingredientIds ? { ingredientIds } : {}), timeoutMs: 90_000 }),
    recipe: (title: string) => http<RecipeDraft>('/api/ai/recipe', { method: 'POST', body: j({ title }), timeoutMs: 90_000 }),
  },
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const d = e.details as { fieldErrors?: Record<string, string[]> } | Array<{ i: number; error: string }> | undefined;
    if (Array.isArray(d)) return d.map((x) => `line ${x.i + 1}: ${x.error}`).join('; ');
    if (d && typeof d === 'object' && 'fieldErrors' in d && d.fieldErrors) return Object.entries(d.fieldErrors).map(([k, v]) => `${k}: ${v.join(', ')}`).join('; ') || e.message;
    return e.message;
  }
  return e instanceof Error ? e.message : String(e);
}
