import { fireEvent, render, screen } from '@testing-library/react-native';

import ReviewSessionScreen from '@/app/review-session';
import { content } from '@/content';
import { reviewQuestions } from '@/trail/review';
import { InMemoryProgressRepository } from '@/db/progress-repository';

let mockRepo: InMemoryProgressRepository;
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({ router: { back: jest.fn() }, useLocalSearchParams: () => mockParams }));
jest.mock('@/trail/review', () => {
  const actual = jest.requireActual('@/trail/review');
  return { ...actual, reviewQuestions: jest.fn(actual.reviewQuestions) };
});
jest.mock('@/db/client', () => ({ get progressRepository() { return mockRepo; } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

beforeEach(() => {
  mockRepo = new InMemoryProgressRepository();
  mockParams = {};
  (reviewQuestions as jest.Mock).mockClear();
});

const [s1, s2] = content.sections;
const completeAll = async (sections = [s1, s2]) => {
  for (const s of sections) for (const l of s.lessons) await mockRepo.recordResult(l.id, 100, true);
};

describe('Reforço (Meus erros)', () => {
  test('no mistakes shows the empty state', async () => {
    await render(<ReviewSessionScreen />);
    await screen.findByText('Nada para reforçar');
  });

  test('with mistakes it starts a session without a lesson score', async () => {
    const lesson = content.lessons[s1.lessons[0].id];
    const step = lesson.steps.find((s) => s.type === 'true_false')!;
    await mockRepo.recordMistakes(lesson.id, [{ stepId: step.id }]);
    await render(<ReviewSessionScreen />);
    await screen.findByText(lesson.title);
    screen.getByText('Verdadeiro');
  });
});

describe('Reforço livre', () => {
  test('section param opens a session titled with the section', async () => {
    mockParams = { section: s1.id };
    await render(<ReviewSessionScreen />);
    await screen.findByText(s1.title);
  });
});

describe('Revisão da trilha', () => {
  test('unknown point shows "Nada para revisar"', async () => {
    mockParams = { point: 'review-99' };
    await render(<ReviewSessionScreen />);
    await screen.findByText('Nada para revisar');
  });

  test('a point not yet active still opens, with the summary', async () => {
    mockParams = { point: 'review-1' };
    await render(<ReviewSessionScreen />);
    await screen.findByText('Resumo');
  });

  test('shows a summary of both sections, then starts the questions on "Começar"', async () => {
    await completeAll();
    mockParams = { point: 'review-1' };
    await render(<ReviewSessionScreen />);
    await screen.findByText('Resumo');
    screen.getByText(s1.title);
    screen.getByText(s2.title);
    await fireEvent.press(screen.getByRole('button', { name: 'Começar' }));
    await screen.findByText('Revisão');
    expect(screen.queryByText('Resumo')).toBeNull();
  });

  test('leaving the summary does not record the review', async () => {
    await completeAll();
    mockParams = { point: 'review-1' };
    await render(<ReviewSessionScreen />);
    await screen.findByText('Resumo');
    await fireEvent.press(screen.getByRole('button', { name: 'Sair da revisão' }));
    expect(await mockRepo.completedReviews()).toEqual([]);
  });

  test('asks 8 questions and finishing records the review (right or wrong answers)', async () => {
    await completeAll();
    mockParams = { point: 'review-1' };
    await render(<ReviewSessionScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Começar' }));
    const steps = (reviewQuestions as jest.Mock).mock.results[0].value;
    expect(steps).toHaveLength(8);
    expect(await mockRepo.completedReviews()).toEqual([]);
    for (const step of steps) {
      if (step.type === 'type_answer') {
        await fireEvent.changeText(screen.getByLabelText('Sua resposta'), 'zzz');
        await fireEvent.press(screen.getByRole('button', { name: 'Conferir' }));
      } else {
        const option = screen.getAllByRole('button').find((b) => !b.props.accessibilityLabel)!;
        await fireEvent.press(option);
      }
      await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    }
    await screen.findByText('Revisão concluída!');
    expect(await mockRepo.completedReviews()).toEqual(['review-1']);
  });

  test('each opening draws the questions again', async () => {
    await completeAll();
    mockParams = { point: 'review-1' };
    const run = async () => {
      (reviewQuestions as jest.Mock).mockClear();
      const r = await render(<ReviewSessionScreen />);
      await screen.findByText('Resumo');
      const steps = (reviewQuestions as jest.Mock).mock.results[0].value;
      await r.unmount();
      return JSON.stringify(steps);
    };
    const draws = new Set([await run(), await run(), await run()]);
    expect(draws.size).toBeGreaterThan(1);
  });
});
