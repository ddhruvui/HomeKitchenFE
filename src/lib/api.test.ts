import { api, ApiError, errorMessage } from './api';

const mockFetch = (status: number, body: unknown) => { globalThis.fetch = vi.fn(async () => ({ ok: status < 400, status, json: async () => body })) as unknown as typeof fetch; };

describe('api client', () => {
  it('returns JSON on success', async () => { mockFetch(200, { people: 2, weekStartsOn: 6 }); expect(await api.settings.get()).toEqual({ people: 2, weekStartsOn: 6 }); });
  it('turns an error body into ApiError with the server message', async () => {
    mockFetch(409, { error: 'an ingredient named "Onion" already exists' });
    await expect(api.ingredients.create({ name: 'Onion', kind: 'pantry', storeId: 's', form: 'Produce' })).rejects.toMatchObject({ status: 409, message: /already exists/ });
  });
  it('treats a missing week list as null, not an error', async () => { mockFetch(404, { error: 'list for that week not found' }); expect(await api.lists.forWeek('2026-09-05')).toBeNull(); });
  it('flattens per-line recipe errors', () => {
    expect(errorMessage(new ApiError(400, 'invalid ingredient lines', [{ i: 1, error: 'Onion is counted in each, not bunch' }]))).toBe('line 2: Onion is counted in each, not bunch');
    expect(errorMessage(new ApiError(400, 'invalid request', { fieldErrors: { buyUnit: ['a fresh ingredient needs a buy unit'] } }))).toMatch(/buyUnit: a fresh/);
  });
});
