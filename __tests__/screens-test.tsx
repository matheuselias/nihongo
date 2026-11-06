import { fireEvent, render, screen } from '@testing-library/react-native';

import { content } from '@/content';
import { progressRepository } from '@/db/client';
import PathScreen from '@/app/(tabs)/index';
import ReviewScreen from '@/app/(tabs)/review';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  const { cloneElement } = jest.requireActual('react');
  return { Link: ({ children, href }: any) => {
    // real expo-router Slot throws on array styles; mirror it so tests catch what only the device caught
    if (Array.isArray(children.props.style)) throw new Error('[expo-router]: array of styles passed to a child of <Slot>');
    return cloneElement(children, { onPress: () => mockRouterPush(href) });
  }, useFocusEffect: (cb: () => void) => useEffect(cb, [cb]) };
});
const mockRouterPush = jest.fn();
let mockRepo: any;
jest.mock('@/db/client', () => ({ get progressRepository() { return mockRepo; } }));
beforeEach(() => {
  mockRouterPush.mockClear();
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
  const total = content.sections.reduce((n, s) => n + s.lessons.length, 0);
  const node = (n: number, title: string) => screen.findByLabelText(new RegExp(`^Lição ${n}: ${title}`));

  test('every lesson is a tappable node, none locked, with the section kanji in the header', async () => {
    await render(<PathScreen />);
    await node(1, first.lessons[0].title);
    expect(screen.getAllByLabelText(/^Lição \d+:/)).toHaveLength(total);
    expect(screen.queryByText(/Bloqueada/)).toBeNull();
    screen.getByText(`一 · ${first.title}`);
  });

  test('the first unfinished lesson is the recommended one', async () => {
    await progressRepository.recordResult(first.lessons[0].id, 90, true);
    await render(<PathScreen />);
    await screen.findByLabelText(new RegExp(`^Lição 2: ${first.lessons[1].title}, recomendada`));
    expect(screen.getAllByRole('button', { selected: true })).toHaveLength(1);
  });

  test('completed node shows the score', async () => {
    await progressRepository.recordResult(first.lessons[0].id, 85, true);
    await render(<PathScreen />);
    await screen.findByLabelText(new RegExp(`^Lição 1: .*concluída, 85%`));
    screen.getByText('85%');
  });

  test('tapping a node opens the preview, tapping outside closes it', async () => {
    await render(<PathScreen />);
    await fireEvent.press(await node(1, first.lessons[0].title));
    screen.getByText(/palavras? novas?/);
    screen.getByText('Não iniciada');
    screen.getByText('Começar');
    await fireEvent.press(screen.getByLabelText('Fechar prévia'));
    expect(screen.queryByText('Começar')).toBeNull();
  });

  test('Começar opens the right lesson', async () => {
    await render(<PathScreen />);
    await fireEvent.press(await node(3, first.lessons[2].title));
    await fireEvent.press(screen.getByText('Começar'));
    expect(mockRouterPush).toHaveBeenCalledWith(expect.objectContaining({ params: { id: first.lessons[2].id } }));
  });

  test('a completed lesson shows its score and Refazer in the preview', async () => {
    await progressRepository.recordResult(first.lessons[0].id, 85, true);
    await render(<PathScreen />);
    await fireEvent.press(await screen.findByLabelText(/^Lição 1: .*concluída/));
    screen.getByText('Concluída · 85%');
    screen.getByText('Refazer');
  });

  test('the Revisão node opens while dimmed and while active', async () => {
    await render(<PathScreen />);
    await fireEvent.press((await screen.findAllByLabelText('Revisão, apagada'))[0]);
    expect(mockRouterPush).toHaveBeenLastCalledWith(expect.objectContaining({ params: { point: 'review-1' } }));
    await complete(content.sections.slice(0, 2).flatMap((s) => s.lessons.map((l) => l.id)));
    await render(<PathScreen />);
    await fireEvent.press((await screen.findAllByLabelText('Revisão, ativa'))[0]);
    expect(mockRouterPush).toHaveBeenLastCalledWith(expect.objectContaining({ params: { point: 'review-1' } }));
  });

  test('finished review point is marked concluded', async () => {
    await complete(content.sections.slice(0, 2).flatMap((s) => s.lessons.map((l) => l.id)));
    await progressRepository.recordReview('review-1');
    await render(<PathScreen />);
    await screen.findByLabelText('Revisão, concluída');
  });
});
