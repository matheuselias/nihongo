import { content } from '@/content';
import { InMemoryProgressRepository, type CardRecord } from '@/db/progress-repository';
import { buildQueue, deckCards } from '@/lesson/deck';

const [l1, l2] = content.sections[0].lessons;
const presented = (id: string) => content.lessons[id].steps.flatMap((s) => (s.type === 'present' ? [s.word] : []));
const rec = (wordId: string, direction: 'jp_to_pt' | 'pt_to_jp', due: Date): CardRecord => ({
  wordId, direction, intervalDays: 1, ease: 2.5, due, correctCount: 1, wrongCount: 0,
});

describe('deckCards', () => {
  test('is empty without completed lessons', () => {
    expect(deckCards(content, new Set())).toEqual([]);
  });

  test('two cards per card-generating word, only from completed lessons, in trail order', () => {
    const words = presented(l1.id).filter((w) => content.words[w].generates_card);
    const deck = deckCards(content, new Set([l1.id]));
    expect(deck.map((c) => c.wordId)).toEqual(words.flatMap((w) => [w, w]));
    expect(deck.slice(0, 2).map((c) => c.direction)).toEqual(['jp_to_pt', 'pt_to_jp']);
    expect(deck.every((c) => content.words[c.wordId].generates_card)).toBe(true);
    expect(deckCards(content, new Set([l2.id])).some((c) => words.includes(c.wordId) && !presented(l2.id).includes(c.wordId))).toBe(false);
  });

  test('a word in two lessons counts once, and repeating the set changes nothing', () => {
    const both = deckCards(content, new Set([l1.id, l2.id]));
    const keys = both.map((c) => `${c.wordId}/${c.direction}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('buildQueue', () => {
  const deck = deckCards(content, new Set(content.sections[0].lessons.map((l) => l.id)));
  const now = new Date('2026-01-10');

  test('new cards come in trail order, capped at 20', () => {
    expect(deck.length).toBeGreaterThan(20);
    expect(buildQueue(deck, [], now)).toEqual(deck.slice(0, 20));
  });

  test('due cards first (most overdue first), then new; not-yet-due cards stay out', () => {
    const states = [
      rec(deck[5].wordId, deck[5].direction, new Date('2026-01-09')),
      rec(deck[6].wordId, deck[6].direction, new Date('2026-01-01')),
      rec(deck[0].wordId, deck[0].direction, new Date('2026-02-01')),
    ];
    const q = buildQueue(deck, states, now);
    expect(q.slice(0, 2)).toEqual([deck[6], deck[5]]);
    expect(q[2]).toEqual(deck[1]);
    expect(q).not.toContainEqual(deck[0]);
  });

  test('is empty when everything was answered and nothing is due', () => {
    const states = deck.map((c) => rec(c.wordId, c.direction, new Date('2026-02-01')));
    expect(buildQueue(deck, states, now)).toEqual([]);
  });
});

describe('saveCardResult (in memory)', () => {
  test('stores the state and counts correct and wrong answers', async () => {
    const repo = new InMemoryProgressRepository();
    const state = { intervalDays: 2, ease: 2.5, due: new Date('2026-01-12') };
    await repo.saveCardResult('w', 'jp_to_pt', state, true);
    await repo.saveCardResult('w', 'jp_to_pt', state, false);
    await repo.saveCardResult('w', 'jp_to_pt', state, true);
    expect(await repo.getCardStates()).toEqual([{ ...state, wordId: 'w', direction: 'jp_to_pt', correctCount: 2, wrongCount: 1 }]);
  });
});
