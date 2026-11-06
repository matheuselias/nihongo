import { fireEvent, render, screen } from '@testing-library/react-native';

import CardSessionScreen from '@/app/card-session';
import { content } from '@/content';
import { InMemoryProgressRepository } from '@/db/progress-repository';

let mockRepo: InMemoryProgressRepository;
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack() } }));
jest.mock('@/db/client', () => ({ get progressRepository() { return mockRepo; } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const type = (t: string) => fireEvent.changeText(screen.getByLabelText('Sua resposta'), t);

beforeEach(async () => {
  mockBack.mockClear();
  mockRepo = new InMemoryProgressRepository();
  await mockRepo.recordResult(content.sections[0].lessons[0].id, 100, true);
});

test('the first card is JP to PT; blank input disables Conferir; wrong shows the answer and no grades', async () => {
  await render(<CardSessionScreen />);
  await screen.findByLabelText('Sua resposta');
  expect(screen.getByRole('button', { name: 'Conferir' })).toBeDisabled();
  await type('   ');
  expect(screen.getByRole('button', { name: 'Conferir' })).toBeDisabled();
  await type('zzz');
  await press('Conferir');
  screen.getByText(/Resposta certa:/);
  expect(screen.queryByRole('button', { name: 'Bom' })).toBeNull();
  expect(screen.getByLabelText('Sua resposta').props.editable).toBe(false);
  screen.getByRole('button', { name: 'Continuar' });
  expect((await mockRepo.getCardStates())[0].wrongCount).toBe(1);
});

test('right answer shows Correto! and the three grades; picking one saves and moves on', async () => {
  await render(<CardSessionScreen />);
  await screen.findByLabelText('Sua resposta');
  const w = content.words[content.lessons[content.sections[0].lessons[0].id].steps.flatMap((s) => (s.type === 'present' ? [s.word] : []))[0]];
  await type(w.translations[0].toUpperCase());
  await press('Conferir');
  screen.getByText('Correto!');
  expect(screen.queryByRole('button', { name: 'Continuar' })).toBeNull();
  await press('Bom');
  expect((await mockRepo.getCardStates())[0].intervalDays).toBe(2);
  expect(screen.getByLabelText('Sua resposta').props.value).toBe('');
});

test('flip shows the answer, counts as wrong and typing afterwards stays wrong', async () => {
  await render(<CardSessionScreen />);
  await screen.findByLabelText('Sua resposta');
  await press('Ver resposta');
  screen.getByText(/Resposta certa:/);
  expect(screen.getByLabelText('Sua resposta').props.editable).toBe(true);
  expect(screen.queryByRole('button', { name: 'Bom' })).toBeNull();
  screen.getByRole('button', { name: 'Continuar' });
  expect((await mockRepo.getCardStates())[0].wrongCount).toBe(1);
});

test('close leaves without confirmation', async () => {
  await render(<CardSessionScreen />);
  await screen.findByLabelText('Sua resposta');
  await press('Sair dos cards');
  expect(mockBack).toHaveBeenCalled();
});
