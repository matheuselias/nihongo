import { render, screen } from '@testing-library/react-native';

import { content } from '@/content';
import { progressRepository } from '@/db/client';
import PathScreen from '@/app/(tabs)/index';
import ReviewScreen from '@/app/(tabs)/review';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return { Link: ({ children }: any) => children, useFocusEffect: (cb: () => void) => useEffect(cb, [cb]) };
});
let mockRepo: any;
jest.mock('@/db/client', () => ({ get progressRepository() { return mockRepo; } }));
beforeEach(() => {
  mockRepo = new (jest.requireActual('@/db/progress-repository').InMemoryProgressRepository)();
});

const first = content.sections[0];
const complete = async (ids: string[]) => {
  for (const id of ids) await progressRepository.recordResult(id, 90, true);
};

describe('Reforço tab', () => {
  test('without mistakes or finished sections: empty state, hint and empty Cards', async () => {
    await render(<ReviewScreen />);
    await screen.findByText('Sem erros pendentes');
    screen.getByText(/Conclua todas as lições de uma seção/);
    screen.getByText('Cards');
    screen.getByText(/As palavras entram no baralho/);
  });

  test('count uses singular for 1 and plural after more', async () => {
    const [l1, l2] = first.lessons;
    const wordStep = (id: string) => content.lessons[id].steps.find((s) => ['multiple_choice', 'type_answer', 'true_false'].includes(s.type))!.id;
    await progressRepository.recordMistakes(l1.id, [{ stepId: wordStep(l1.id) }]);
    const r = await render(<ReviewScreen />);
    await screen.findByText('1 erro pendente');
    screen.getByText('Reforçar (1)');
    await r.unmount();
    await progressRepository.recordMistakes(l2.id, [{ stepId: wordStep(l2.id) }]);
    await render(<ReviewScreen />);
    await screen.findByText('2 erros pendentes');
    screen.getByText('Reforçar (2)');
  });

  test('only fully completed sections are offered for free practice', async () => {
    await complete(first.lessons.slice(0, -1).map((l) => l.id));
    await render(<ReviewScreen />);
    await screen.findByText('Praticar uma seção');
    expect(screen.queryByText(first.title)).toBeNull();
  });

  test('a completed section is listed', async () => {
    await complete(first.lessons.map((l) => l.id));
    await render(<ReviewScreen />);
    await screen.findByText(first.title);
  });
});

describe('Cards block', () => {
  const { deckCards } = jest.requireActual('@/lesson/deck');
  const lessonIds = first.lessons.map((l) => l.id);

  test('shows due and new counts and a Estudar button', async () => {
    await complete([lessonIds[0]]);
    const deck = deckCards(content, new Set([lessonIds[0]]));
    await progressRepository.saveCardResult(deck[0].wordId, deck[0].direction, { intervalDays: 1, ease: 2.5, due: new Date(0) }, true);
    await render(<ReviewScreen />);
    await screen.findByText('1 para revisar');
    screen.getByText(`${deck.length - 1} novos`);
    screen.getByText('Estudar');
  });

  test('says the person is up to date when nothing is due or new', async () => {
    await complete([lessonIds[0]]);
    const future = new Date(Date.now() + 1e10);
    for (const c of deckCards(content, new Set([lessonIds[0]])))
      await progressRepository.saveCardResult(c.wordId, c.direction, { intervalDays: 1, ease: 2.5, due: future }, true);
    await render(<ReviewScreen />);
    await screen.findByText('Você está em dia!');
    expect(screen.queryByText('Estudar')).toBeNull();
  });
});

describe('Trilha tab', () => {
  test('only the first lesson is available at the start', async () => {
    await render(<PathScreen />);
    await screen.findByText(first.lessons[0].title);
    expect(screen.getAllByText('Disponível')).toHaveLength(1);
    expect(screen.queryByText(/Concluída/)).toBeNull();
  });

  test('shows score on completed lessons and a Revisão card only after 2 sections', async () => {
    await progressRepository.recordResult(first.lessons[0].id, 85, true);
    await render(<PathScreen />);
    await screen.findByText('Concluída · 85%');
    expect(screen.queryByText('Revisão')).toBeNull();
  });

  test('Revisão card appears (optional, then checked) after two sections are done', async () => {
    await complete(content.sections.slice(0, 2).flatMap((s) => s.lessons.map((l) => l.id)));
    await render(<PathScreen />);
    await screen.findByText('Revisão');
    screen.getByText('Opcional');
  });

  test('finished review point gets a check', async () => {
    await complete(content.sections.slice(0, 2).flatMap((s) => s.lessons.map((l) => l.id)));
    await progressRepository.recordReview('review-1');
    await render(<PathScreen />);
    await screen.findByText('Concluída ✓');
  });
});
