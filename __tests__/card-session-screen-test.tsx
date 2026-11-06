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

const answerAll = async (right: boolean) => {
  for (let i = 0; i < 40 && !screen.queryByText(/de primeira/); i++) {
    await screen.findByLabelText('Sua resposta');
    if (right) {
      const label = screen.getByText(/O que significa|Como se diz/).props.children;
      const shown = screen.getAllByText(/./).map((n) => String(n.props.children));
      const w = Object.values(content.words).find((x) => shown.some((t) => t === (label.startsWith('O que') ? `${x.kanji ?? x.kana} (${x.romaji})` : x.translations[0] + (x.hint ? ` (${x.hint})` : ''))));
      await type(label.startsWith('O que') ? w!.translations[0] : w!.romaji);
      await press('Conferir');
      await press(screen.queryByRole('button', { name: 'Bom' }) ? 'Bom' : 'Continuar');
    } else {
      await press('Ver resposta');
      await press('Continuar');
    }
  }
};

test('end screen: summary counts first tries, repeat saves nothing, next 20 and exit', async () => {
  await render(<CardSessionScreen />);
  await answerAll(true);
  const n = (await mockRepo.getCardStates()).length;
  screen.getByText(`${n} de ${n} de primeira`);
  const before = JSON.stringify(await mockRepo.getCardStates());

  await press(/Repetir estes/);
  await screen.findByLabelText('Sua resposta');
  await press('Ver resposta');
  expect(screen.queryByRole('button', { name: 'Bom' })).toBeNull();
  await press('Continuar');
  await answerAll(false);
  expect(JSON.stringify(await mockRepo.getCardStates())).toBe(before);

  await press('Próximos 20');
  await screen.findByText('Você está em dia.');
  await press('Sair');
  expect(mockBack).toHaveBeenCalled();
});

test('summary counts only first-try hits when cards are missed', async () => {
  await render(<CardSessionScreen />);
  await screen.findByLabelText('Sua resposta');
  await press('Ver resposta');
  await press('Continuar');
  await answerAll(true);
  const n = (await mockRepo.getCardStates()).length;
  screen.getByText(`${n - 1} de ${n} de primeira`);
});

test('a failed lesson adds no cards', async () => {
  mockRepo = new InMemoryProgressRepository();
  await mockRepo.recordResult(content.sections[0].lessons[0].id, 50, false);
  await render(<CardSessionScreen />);
  await screen.findByText('Você está em dia.');
});

test('the PT to JP card shows the first translation with the hint in parentheses', async () => {
  await render(<CardSessionScreen />);
  await screen.findByLabelText('Sua resposta');
  for (let i = 0; i < 40 && !screen.queryByText('Como se diz em japonês?'); i++) {
    await press('Ver resposta');
    await press('Continuar');
  }
  const w = Object.values(content.words).find((x) => x.hint && screen.queryByText(`${x.translations[0]} (${x.hint})`));
  expect(w).toBeDefined();
});

test('study days: finishing a session counts 1 day; leaving midway and "Repetir estes" do not', async () => {
  await render(<CardSessionScreen />);
  await screen.findByLabelText('Sua resposta');
  await press('Ver resposta');
  await press('Continuar');
  expect(await mockRepo.countStudyDays()).toBe(0);
  await answerAll(true);
  expect(await mockRepo.countStudyDays()).toBe(1);

  mockRepo = new InMemoryProgressRepository();
  await mockRepo.recordResult(content.sections[0].lessons[0].id, 100, true);
  await screen.unmount();
  await render(<CardSessionScreen />);
  await answerAll(true);
  const days = await mockRepo.countStudyDays();
  await press(/Repetir estes/);
  await answerAll(true);
  expect(await mockRepo.countStudyDays()).toBe(days);
});
