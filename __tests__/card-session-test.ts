import { content } from '@/content';
import { InMemoryProgressRepository } from '@/db/progress-repository';
import { CardSession } from '@/lesson/card-session';
import type { DeckCard } from '@/lesson/deck';

const words = ['ohayou-gozaimasu', 'ohayou', 'konnichiwa', 'konbanwa', 'oyasumi', 'arigatou'].filter((w) => content.words[w]);
const cards = (n: number): DeckCard[] => words.slice(0, n).map((wordId) => ({ wordId, direction: 'pt_to_jp' }));
const many = (): DeckCard[] => words.flatMap((wordId) => (['pt_to_jp', 'jp_to_pt'] as const).map((direction) => ({ wordId, direction })));
const right = (c: DeckCard) => (c.direction === 'pt_to_jp' ? content.words[c.wordId].kana : content.words[c.wordId].translations[0]);
const NOW = new Date('2026-01-01T00:00:00Z');
let repo: InMemoryProgressRepository;
const make = (q: DeckCard[], rng = () => 0) => new CardSession(content, q, [], repo, rng, () => NOW);
const mk = (w: string) => content.words[w].kana;
beforeEach(() => (repo = new InMemoryProgressRepository()));

describe('CardSession', () => {
  test.each([
    ['kana', (w: string) => content.words[w].kana],
    ['romaji', (w: string) => content.words[w].romaji.toUpperCase()],
  ])('right %s needs a grade, then saves it', async (_n, input) => {
    const s = make(cards(1));
    expect(await s.answerText(input(words[0]))).toBe(true);
    expect(s.canContinue).toBe(false);
    expect(() => s.next()).toThrow();
    expect(await repo.getCardStates()).toEqual([]);
    await s.grade('easy');
    const [r] = await repo.getCardStates();
    expect([r.intervalDays, r.correctCount, r.wrongCount]).toEqual([4, 1, 0]);
    s.next();
    expect(s.finished).toBe(true);
  });

  test('wrong typing saves immediately, rejects grades, and returns the card', async () => {
    const s = make(cards(2));
    expect(await s.answerText('xyz')).toBe(false);
    const [r] = await repo.getCardStates();
    expect([r.intervalDays, r.wrongCount]).toEqual([1, 1]);
    await expect(s.grade('good')).rejects.toThrow();
    s.next();
    expect(s.current!.wordId).toBe(words[1]);
  });

  test('flip counts as wrong and typing the right answer afterwards does not change it', async () => {
    const s = make(cards(1));
    await s.flip();
    expect(await s.answerText(mk(words[0]))).toBe(true);
    expect(s.outcome).toBe(false);
    expect(s.needsGrade).toBe(false);
    expect((await repo.getCardStates())[0].wrongCount).toBe(1);
  });

  test('wrong card returns 3 to 5 places later and only the first attempt is counted', async () => {
    for (const [roll, gap] of [[0, 3], [0.99, 5]] as const) {
      repo = new InMemoryProgressRepository();
      const s = make(many(), () => roll);
      const first = s.current!;
      await s.answerText('xyz');
      s.next();
      let seen = 0;
      while (s.current !== first) {
        await s.answerText(right(s.current!));
        await s.grade('good');
        s.next();
        seen++;
      }
      expect(seen).toBe(gap);
      await s.answerText(right(first)); // recovery: no grade, no save
      expect(s.needsGrade).toBe(false);
      s.next();
      const rec = (await repo.getCardStates()).find((c) => c.wordId === first.wordId && c.direction === first.direction)!;
      expect([rec.intervalDays, rec.correctCount, rec.wrongCount]).toEqual([1, 0, 1]);
      while (!s.finished) {
        await s.answerText(right(s.current!));
        await s.grade('good');
        s.next();
      }
    }
  });

  test('a short queue reinserts at the end, and the session never ends with a wrong card pending', async () => {
    const s = make(cards(1));
    await s.answerText('xyz');
    s.next();
    expect(s.finished).toBe(false);
    await s.answerText('xyz');
    s.next();
    expect(s.finished).toBe(false);
    await s.answerText(mk(words[0]));
    s.next();
    expect(s.finished).toBe(true);
    expect((await repo.getCardStates())[0].wrongCount).toBe(1);
  });

  test('leaving midway keeps what was saved and leaves the rest untouched', async () => {
    const s = make(cards(3));
    await s.answerText(mk(words[0]));
    await s.grade('good');
    s.next();
    await s.answerText('xyz');
    expect((await repo.getCardStates()).map((c) => c.wordId).sort()).toEqual([words[0], words[1]].sort());
  });
});
