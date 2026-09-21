import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api, ApiError } from '../lib/api';
import { RecipeChat } from './RecipeChat';

const ask = () => screen.getByLabelText('ask about the dish');

describe('asking about the dish', () => {
  it('sends the question, shows the answer, and carries the history into a follow-up', async () => {
    const chat = vi.spyOn(api.ai, 'chat')
      .mockResolvedValueOnce({ reply: 'Boil two potatoes.', model: 'm' })
      .mockResolvedValueOnce({ reply: 'Use one cup of peas.', model: 'm' });
    render(<RecipeChat title="Pav Bhaji" />);

    await userEvent.type(ask(), 'How do I make it?');
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(await screen.findByText('Boil two potatoes.')).toBeInTheDocument();
    expect(chat).toHaveBeenCalledWith([{ role: 'user', text: 'How do I make it?' }]);

    await userEvent.type(ask(), 'And the peas?');
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(await screen.findByText('Use one cup of peas.')).toBeInTheDocument();
    expect(chat).toHaveBeenLastCalledWith([
      { role: 'user', text: 'How do I make it?' },
      { role: 'model', text: 'Boil two potatoes.' },
      { role: 'user', text: 'And the peas?' },
    ]);
  });

  it('Enter sends and Shift+Enter does not', async () => {
    const chat = vi.spyOn(api.ai, 'chat').mockResolvedValue({ reply: 'ok', model: 'm' });
    render(<RecipeChat title="" />);
    await userEvent.type(ask(), 'a line{Shift>}{Enter}{/Shift}still typing');
    expect(chat).not.toHaveBeenCalled();
    await userEvent.type(ask(), '{Enter}');
    expect(await screen.findByText('ok')).toBeInTheDocument();
    expect(chat).toHaveBeenCalledWith([{ role: 'user', text: 'a line\nstill typing' }]);
  });

  it('a failed question keeps the text on screen and offers a retry', async () => {
    const chat = vi.spyOn(api.ai, 'chat')
      .mockRejectedValueOnce(new ApiError(502, 'The model is busy right now'))
      .mockResolvedValueOnce({ reply: 'Second time lucky.', model: 'm' });
    render(<RecipeChat title="Poha" />);
    await userEvent.type(ask(), 'Is this quick?{Enter}');
    expect(await screen.findByText('The model is busy right now')).toBeInTheDocument();
    expect(screen.getByText('Is this quick?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Second time lucky.')).toBeInTheDocument();
    expect(chat).toHaveBeenCalledTimes(2);
  });

  it('start over clears the thread', async () => {
    vi.spyOn(api.ai, 'chat').mockResolvedValue({ reply: 'Boil it.', model: 'm' });
    render(<RecipeChat title="Khichdi" />);
    await userEvent.type(ask(), 'How?{Enter}');
    expect(await screen.findByText('Boil it.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start over' }));
    expect(screen.queryByText('Boil it.')).not.toBeInTheDocument();
    expect(ask()).toHaveAttribute('placeholder', 'How do I make khichdi?'.replace('khichdi', 'Khichdi'));
  });

  it('suggests the recipe title as the first question', () => {
    render(<RecipeChat title="  Palak Paneer  " />);
    expect(ask()).toHaveAttribute('placeholder', 'How do I make Palak Paneer?');
    expect(within(document.body).queryByRole('button', { name: 'Start over' })).not.toBeInTheDocument();
  });
});
