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
  { id: 'i2', name: 'Turmeric', kind: 'pantry', storeId: 's1', form: 'Masala' },
  { id: 'i3', name: 'Milk', kind: 'weekly', storeId: 's1', form: 'Dairy', weeklyQty: 2 },
];
const recipes: Recipe[] = [{ id: 'r1', title: 'Pav Bhaji', ingredients: [{ ingredientId: 'i1' }], morningSteps: [], steps: ['Boil the potatoes.'], tags: [], sources: [] }];

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

  it('saves morning and evening steps as separate lists', async () => {
    const update = vi.spyOn(api.recipes, 'update').mockResolvedValue(recipes[0]);
    wrap(<RecipesPage />);
    await userEvent.click(await screen.findByText('Pav Bhaji'));
    expect(await screen.findByDisplayValue('Boil the potatoes.')).toHaveAccessibleName('evening step 1');
    await userEvent.type(screen.getByLabelText('morning step 1'), 'Soak the peas.');
    await userEvent.click(screen.getByRole('button', { name: 'Save recipe' }));
    expect(update).toHaveBeenCalledWith('r1', expect.objectContaining({ morningSteps: ['Soak the peas.'], steps: ['Boil the potatoes.'] }));
  });

  it('saves sources, links them, and drops blank ones', async () => {
    const update = vi.spyOn(api.recipes, 'update').mockResolvedValue(recipes[0]);
    wrap(<RecipesPage />);
    await userEvent.click(await screen.findByText('Pav Bhaji'));
    await userEvent.click(await screen.findByRole('button', { name: 'Add a source' }));
    await userEvent.type(screen.getByLabelText('source 1'), 'https://www.example.com/pav-bhaji');
    expect(screen.getByRole('link', { name: 'open example.com' })).toHaveAttribute('href', 'https://www.example.com/pav-bhaji');
    await userEvent.click(screen.getByRole('button', { name: 'Add a source' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save recipe' }));
    expect(update).toHaveBeenCalledWith('r1', expect.objectContaining({ sources: ['https://www.example.com/pav-bhaji'] }));
  });
});

describe('filtering by tag', () => {
  const tagged: Recipe[] = [
    { id: 'r1', title: 'Pav Bhaji', ingredients: [], morningSteps: [], steps: [], tags: ['street food'], sources: [] },
    { id: 'r2', title: 'Tomato Soup', ingredients: [], morningSteps: [], steps: [], tags: ['Soup', 'quick'], sources: [] },
    { id: 'r3', title: 'Dal Shorba', ingredients: [], morningSteps: [], steps: [], tags: ['soup'], sources: [] },
  ];
  beforeEach(() => {
    vi.spyOn(api.recipes, 'list').mockResolvedValue(tagged);
    vi.spyOn(api.ingredients, 'list').mockResolvedValue(ingredients);
    vi.spyOn(api.stores, 'list').mockResolvedValue(stores);
  });

  it('shows only recipes with the picked tag, ignoring case, and clears on a second click', async () => {
    wrap(<RecipesPage />);
    const soup = await screen.findByRole('button', { name: 'soup (2)' });
    expect(screen.getByRole('button', { name: 'quick (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'street food (1)' })).toBeInTheDocument();
    await userEvent.click(soup);
    expect(screen.getByText('Tomato Soup')).toBeInTheDocument();
    expect(screen.getByText('Dal Shorba')).toBeInTheDocument();
    expect(screen.queryByText('Pav Bhaji')).not.toBeInTheDocument();
    await userEvent.click(soup);
    expect(screen.getByText('Pav Bhaji')).toBeInTheDocument();
  });

  it('lets you type a comma between tags', async () => {
    wrap(<RecipesPage />);
    await userEvent.click(await screen.findByRole('button', { name: /New recipe/ }));
    const input = screen.getByLabelText(/Tags/);
    await userEvent.type(input, 'soup, quick');
    expect(input).toHaveValue('soup, quick');
  });
});
