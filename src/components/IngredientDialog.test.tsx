import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IngredientDialog } from './IngredientDialog';
import { api } from '../lib/api';

const stores = [{ id: 's1', name: 'Costco', sortOrder: 0, color: '#4f8a5f' }, { id: 's2', name: 'Indian Store', sortOrder: 1, color: '#b07d33' }];

describe('IngredientDialog', () => {
  it('a pantry item asks for no quantity; switching to fresh reveals the units', () => {
    render(<IngredientDialog stores={stores} onClose={() => {}} onSaved={() => {}} />);
    expect(screen.getByText(/No quantity needed/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Bought by/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Fresh/ }));
    expect(screen.getByLabelText(/Bought by/)).toBeInTheDocument();
    expect(screen.queryByText(/No quantity needed/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Weekly/ }));
    expect(screen.getByLabelText(/How many every week/)).toBeInTheDocument();
  });
  it('sends only the fields that belong to the kind', async () => {
    const create = vi.spyOn(api.ingredients, 'create').mockResolvedValue({ id: 'x', name: 'Rice', kind: 'pantry', storeId: 's2', form: 'Dry Goods' });
    const onSaved = vi.fn();
    render(<IngredientDialog stores={stores} onClose={() => {}} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Rice' } });
    fireEvent.click(screen.getByRole('button', { name: /Indian Store/ }));
    fireEvent.change(screen.getByLabelText('Aisle'), { target: { value: 'Dry Goods' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add ingredient' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith({ name: 'Rice', kind: 'pantry', storeId: 's2', form: 'Dry Goods' });
  });
  it('a fresh item defaults its fridge unit to the buy unit and carries a count unit', async () => {
    const create = vi.spyOn(api.ingredients, 'create').mockResolvedValue({ id: 'y', name: 'Coriander', kind: 'fresh', storeId: 's2', form: 'Produce' });
    render(<IngredientDialog stores={stores} onClose={() => {}} onSaved={() => {}} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Coriander' } });
    fireEvent.click(screen.getByRole('button', { name: /Fresh/ }));
    fireEvent.change(screen.getByLabelText(/Bought by/), { target: { value: 'bunch' } });
    fireEvent.change(screen.getByLabelText(/oz per bunch/), { target: { value: '2.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add ingredient' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({ kind: 'fresh', buyUnit: 'bunch', stockUnit: 'bunch', countUnit: 'bunch', ozPerCount: 2.5 });
  });
  it('shows the server error instead of closing', async () => {
    vi.spyOn(api.ingredients, 'create').mockRejectedValue(Object.assign(new Error('an ingredient named "Rice" already exists'), { name: 'ApiError', status: 409 }));
    const onSaved = vi.fn();
    render(<IngredientDialog stores={stores} onClose={() => {}} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Rice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add ingredient' }));
    await screen.findByText(/already exists/);
    expect(onSaved).not.toHaveBeenCalled();
  });
});
