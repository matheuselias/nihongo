import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { Player } from '@/components/lesson-player';
import type { Step } from '@/content/schema';
import { InMemoryProgressRepository } from '@/db/progress-repository';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack() } }));
jest.mock('@/db/client', () => ({ get progressRepository() { return mockRepo; } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const LESSON = 'greetings-good-morning';
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

let mockRepo: InMemoryProgressRepository;
beforeEach(() => {
  mockBack.mockClear();
  mockRepo = new InMemoryProgressRepository();
});

const typeStep = (direction: 'pt_to_jp' | 'jp_to_pt'): Step => ({ id: 's1', type: 'type_answer', word: 'ohayou-gozaimasu', direction });
const tf: Step = { id: 's2', type: 'true_false', statement: 'Afirmação X', answer: true, explanation: 'Porque sim.' };
const situation: Step = {
  id: 's3',
  type: 'situation',
  context: 'Contexto Y',
  options: [
    { jp: 'おはよう', romaji: 'ohayou', pt: 'Bom dia (casual)' },
    { jp: 'おはようございます', romaji: 'ohayou gozaimasu', pt: 'Bom dia (formal)' },
  ],
  answer: 1,
  explanation: 'Formal com chefe.',
};
const build: Step = { id: 's4', type: 'build_sentence', pt: 'Pessoal, boa noite!', blocks: ['みなさん', 'こんばんは'], romaji: 'Minasan, konbanwa' };

describe('type_answer', () => {
  test('PT to JP shows first translation with hint; Conferir is disabled for blank input', async () => {
    await render(<Player lessonId={LESSON} custom={[typeStep('pt_to_jp')]} title="T" />);
    screen.getByText('bom dia (formal)');
    expect(screen.getByRole('button', { name: 'Conferir' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Sua resposta'), '   ');
    expect(screen.getByRole('button', { name: 'Conferir' })).toBeDisabled();
  });

  test('JP to PT shows kana with romaji', async () => {
    await render(<Player lessonId={LESSON} custom={[typeStep('jp_to_pt')]} title="T" />);
    screen.getByText('おはようございます (ohayou gozaimasu)');
  });

  test.each(['  OHAYOU Gozaimasu! ', 'おはようございます'])('accepts %j and locks the field', async (answer) => {
    await render(<Player lessonId={LESSON} custom={[typeStep('pt_to_jp')]} title="T" />);
    await fireEvent.changeText(screen.getByLabelText('Sua resposta'), answer);
    await press('Conferir');
    screen.getByText('Correto!');
    expect(screen.getByLabelText('Sua resposta').props.editable).toBe(false);
    expect(screen.queryByRole('button', { name: 'Conferir' })).toBeNull();
    screen.getByRole('button', { name: 'Continuar' });
  });

  test('wrong answer shows the expected one; keyboard "done" submits like the button', async () => {
    await render(<Player lessonId={LESSON} custom={[typeStep('pt_to_jp')]} title="T" />);
    const input = screen.getByLabelText('Sua resposta');
    await fireEvent.changeText(input, 'zzz');
    await fireEvent(input, 'submitEditing');
    screen.getByText('Resposta certa: おはようございます (ohayou gozaimasu)');
  });

  test('field is empty again on the next step', async () => {
    await render(<Player lessonId={LESSON} custom={[typeStep('pt_to_jp'), { ...typeStep('pt_to_jp'), id: 's9' }]} title="T" />);
    await fireEvent.changeText(screen.getByLabelText('Sua resposta'), 'x');
    await press('Conferir');
    await press('Continuar');
    expect(screen.getByLabelText('Sua resposta').props.value).toBe('');
  });
});

describe('situation', () => {
  test('hides pt before answering, then marks answer and shows explanation', async () => {
    await render(<Player lessonId={LESSON} custom={[situation]} title="T" />);
    screen.getByText('Contexto Y');
    expect(screen.queryByText('Bom dia (formal)')).toBeNull();
    await fireEvent.press(screen.getByText('おはよう'));
    screen.getByText('Bom dia (formal)');
    screen.getByText('Bom dia (casual)');
    screen.getByText(/Resposta certa: おはようございます/);
    screen.getByText(/Formal com chefe\./);
    screen.getByRole('button', { name: 'Continuar' });
  });

  test('only accepts one answer', async () => {
    await render(<Player lessonId={LESSON} custom={[situation]} title="T" />);
    await fireEvent.press(screen.getByText('おはようございます'));
    screen.getByText(/Correto!/);
    await fireEvent.press(screen.getByText('おはよう'));
    screen.getByText(/Correto!/);
  });
});

describe('true_false', () => {
  test('shows explanation on a right answer', async () => {
    await render(<Player lessonId={LESSON} custom={[tf]} title="T" />);
    await fireEvent.press(screen.getByText('Verdadeiro'));
    screen.getByText(/Correto!.*Porque sim\./);
  });

  test('wrong answer shows the explanation too', async () => {
    await render(<Player lessonId={LESSON} custom={[tf]} title="T" />);
    await fireEvent.press(screen.getByText('Falso'));
    screen.getByText(/Incorreto\..*Porque sim\./);
  });
});

describe('build_sentence', () => {
  test('Conferir needs every block; tapping a tray block returns it to the bank', async () => {
    await render(<Player lessonId={LESSON} custom={[build]} title="T" />);
    expect(screen.getByRole('button', { name: 'Conferir' })).toBeDisabled();
    await fireEvent.press(screen.getAllByText('みなさん')[0]);
    expect(screen.getByRole('button', { name: 'Conferir' })).toBeDisabled();
    await fireEvent.press(screen.getByLabelText('Remover みなさん'));
    expect(screen.queryByLabelText('Remover みなさん')).toBeNull();
    await fireEvent.press(screen.getAllByText('みなさん')[0]);
    await fireEvent.press(screen.getAllByText('こんばんは')[0]);
    expect(screen.getByRole('button', { name: 'Conferir' })).toBeEnabled();
  });

  test('right order is correct', async () => {
    await render(<Player lessonId={LESSON} custom={[build]} title="T" />);
    await fireEvent.press(screen.getAllByText('みなさん')[0]);
    await fireEvent.press(screen.getAllByText('こんばんは')[0]);
    await press('Conferir');
    screen.getByText('Correto! (Minasan, konbanwa)');
  });

  test('wrong order shows the answer with romaji', async () => {
    await render(<Player lessonId={LESSON} custom={[build]} title="T" />);
    await fireEvent.press(screen.getAllByText('こんばんは')[0]);
    await fireEvent.press(screen.getAllByText('みなさん')[0]);
    await press('Conferir');
    screen.getByText('Resposta certa: みなさん こんばんは (Minasan, konbanwa)');
  });
});

describe('lesson run', () => {
  test('leaving mid-lesson asks for confirmation and saves nothing', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.find((b) => b.text === 'Sair')?.onPress?.());
    await render(<Player lessonId={LESSON} />);
    await press('Sair da lição');
    expect(alert).toHaveBeenCalledWith('Sair da lição?', expect.any(String), expect.any(Array));
    expect(mockBack).toHaveBeenCalled();
    expect(await mockRepo.getAll()).toEqual([]);
    expect(await mockRepo.listMistakes()).toEqual([]);
  });

  test('reinforcement: free practice ends with score only, no queue text, and saves nothing', async () => {
    await render(<Player lessonId={LESSON} custom={[tf]} title="Cumprimentos" />);
    await fireEvent.press(screen.getByText('Falso'));
    await press('Continuar');
    await waitFor(() => screen.getByText('Reforço concluído!'));
    screen.getByText('Acertos: 0%.');
    screen.getByRole('button', { name: 'Voltar' });
    expect(await mockRepo.listMistakes()).toEqual([]);
  });

  test('review point ends with "Revisão concluída!" and calls onDone', async () => {
    const onDone = jest.fn();
    await render(<Player lessonId={LESSON} custom={[tf]} title="Revisão" onDone={onDone} />);
    await fireEvent.press(screen.getByText('Verdadeiro'));
    await press('Continuar');
    await waitFor(() => screen.getByText('Revisão concluída!'));
    expect(onDone).toHaveBeenCalled();
  });

  test('Meus erros: right answer clears the mistake, wrong keeps it', async () => {
    const { content } = jest.requireActual('@/content');
    const ids = [
      ['greetings-good-morning', 's09'],
      ['greetings-afternoon-and-evening', 's08'],
    ];
    for (const [l, st] of ids) await mockRepo.recordMistakes(l, [{ stepId: st }]);
    const picks = ids.map(([lessonId, stepId]) => ({ lessonId, stepId }));
    await render(<Player lessonId={ids[0][0]} picks={picks} />);
    const answers = ids.map(([l, st]) => content.lessons[l].steps.find((x: Step) => x.id === st).answer as boolean);
    await fireEvent.press(screen.getByText(answers[0] ? 'Verdadeiro' : 'Falso'));
    await press('Continuar');
    await fireEvent.press(screen.getByText(answers[1] ? 'Falso' : 'Verdadeiro'));
    await press('Continuar');
    await waitFor(() => screen.getByText(/Reforço concluído!/));
    screen.getByText(/O que você errar fica na fila/);
    expect((await mockRepo.listMistakes()).map((m) => m.stepId)).toEqual(['s08']);
  });
});
