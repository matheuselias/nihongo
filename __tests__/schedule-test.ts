import { schedule, type CardState, type Grade } from '@/lesson/schedule';

const now = new Date('2026-01-01T00:00:00Z');
const days = (s: CardState) => (s.due.getTime() - now.getTime()) / 86_400_000;
const history: CardState = { intervalDays: 10, ease: 2.5, due: now };
const grades: Grade[] = ['wrong', 'hard', 'good', 'easy'];

describe('schedule', () => {
  it.each([['hard', 1], ['good', 2], ['easy', 4]] as const)('first %s on a new card returns in %i days', (g, d) => {
    expect(days(schedule(null, g, now))).toBe(d);
  });

  it.each([null, history])('orders wrong < hard < good < easy (state %#)', (state) => {
    const t = grades.map((g) => days(schedule(state, g, now)));
    expect(t).toEqual([...t].sort((a, b) => a - b));
    // new card: wrong and hard are both 1 day by spec
    expect(new Set(t).size).toBe(state ? 4 : 3);
  });

  it('wrong goes back to 1 day', () => {
    expect(days(schedule(history, 'wrong', now))).toBe(1);
  });

  it('ease rises with easy, falls with hard and wrong', () => {
    expect(schedule(history, 'easy', now).ease).toBeGreaterThan(2.5);
    expect(schedule(history, 'hard', now).ease).toBeLessThan(2.5);
    expect(schedule(history, 'wrong', now).ease).toBeLessThan(2.5);
  });

  it('ease never drops below 1.3', () => {
    let s: CardState | null = null;
    for (let i = 0; i < 20; i++) s = schedule(s, 'wrong', now);
    expect(s!.ease).toBe(1.3);
  });

  it('interval grows on every good', () => {
    let s = schedule(null, 'good', now);
    for (let i = 0; i < 5; i++) {
      const next = schedule(s, 'good', now);
      expect(next.intervalDays).toBeGreaterThan(s.intervalDays);
      s = next;
    }
  });
});
