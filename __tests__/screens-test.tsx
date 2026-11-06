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
  test('without mistakes or finished sections: empty state, hint and Cards "Em breve"', async () => {
    await render(<ReviewScreen />);
    await screen.findByText('Sem erros pendentes');
    screen.getByText(/Conclua todas as lições de uma seção/);
    screen.getByText('Cards');
    screen.getByText('Em breve');
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
