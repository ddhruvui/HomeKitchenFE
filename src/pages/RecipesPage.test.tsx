import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '../lib/api';
import { RecipesPage } from './RecipesPage';
import type { Ingredient, Recipe, Store } from '../lib/types';

const stores: Store[] = [{ id: 's1', name: 'Indian Store', sortOrder: 0, color: '#4f8a5f' }];
const ingredients: Ingredient[] = [
  { id: 'i1', name: 'Paneer', kind: 'fresh', storeId: 's1', form: 'Dairy', buyUnit: 'lb' },
  { id: 'i2', name: 'Turmeric', kind: 'pantry', storeId: 's1', form: 'Spices' },
  { id: 'i3', name: 'Milk', kind: 'weekly', storeId: 's1', form: 'Dairy', weeklyQty: 2 },
];
const recipes: Recipe[] = [{ id: 'r1', title: 'Pav Bhaji', ingredients: [{ ingredientId: 'i1' }], steps: ['Boil the potatoes.'], tags: [] }];

const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);

describe('the catalog under a new recipe', () => {
  beforeEach(() => {
    vi.spyOn(api.recipes, 'list').mockResolvedValue(recipes);
    vi.spyOn(api.ingredients, 'list').mockResolvedValue(ingredients);
    vi.spyOn(api.stores, 'list').mockResolvedValue(stores);
  });

  it('lists every ingredient the way the Ingredients page does', async () => {
    wrap(<RecipesPage />);
    await userEvent.click(await screen.findByRole('button', { name: /New recipe/ }));
    const table = await screen.findByRole('table');
    for (const name of ['Paneer', 'Turmeric', 'Milk']) expect(within(table).getByText(name)).toBeInTheDocument();
    expect(within(table).getAllByText('Indian Store')).toHaveLength(3);
    expect(within(table).getByText('Fresh')).toBeInTheDocument();
    expect(within(table).getByText('by lb')).toBeInTheDocument();
    expect(within(table).getByText('2 every week')).toBeInTheDocument();
    expect(within(table).getByText('no quantity — marked low')).toBeInTheDocument();
    expect(screen.getByText('3 ingredients')).toBeInTheDocument();
  });

  it('narrows to what the search matches', async () => {
    wrap(<RecipesPage />);
    await userEvent.click(await screen.findByRole('button', { name: /New recipe/ }));
    const table = await screen.findByRole('table');
    await userEvent.type(screen.getByLabelText('search ingredients'), 'ee');
    expect(within(table).getByText('Paneer')).toBeInTheDocument();
    expect(within(table).queryByText('Turmeric')).not.toBeInTheDocument();
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('search ingredients'));
    expect(within(table).getByText('Turmeric')).toBeInTheDocument();
  });

  it('puts an ingredient on the recipe with +, once', async () => {
    wrap(<RecipesPage />);
    await userEvent.click(await screen.findByRole('button', { name: /New recipe/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'add Milk' }));
    expect(screen.getByLabelText('ingredient')).toHaveValue('i3');
    expect(screen.queryByRole('button', { name: 'add Milk' })).not.toBeInTheDocument();
    expect(within(await screen.findByRole('table')).getByText('added')).toBeInTheDocument();
  });

  it('stays out of the way when an existing recipe is open', async () => {
    wrap(<RecipesPage />);
    await userEvent.click(await screen.findByText('Pav Bhaji'));
    expect(await screen.findByDisplayValue('Pav Bhaji')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
