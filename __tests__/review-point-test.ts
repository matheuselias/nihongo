import { content } from '@/content';
import type { Content } from '@/content/load';
import { InMemoryProgressRepository } from '@/db/progress-repository';
import { reviewQuestions } from '@/trail/review';
import { lessonStates, reviewPoints } from '@/trail/rules';

// The first four real sections.
const real = content.sections.slice(0, 4);
const four: Content = { ...content, sections: real };
const lessonIds = (i: number) => real[i].lessons.map((l) => l.id);
const done = (...secs: number[]) => new Set(secs.flatMap(lessonIds));

test('review point N appears after section 2N, only once it is completed', () => {
  expect(reviewPoints(four, done())).toEqual([]);
  expect(reviewPoints(four, done(0, 1).add(lessonIds(1)[0]))).toHaveLength(1);
  expect(reviewPoints(four, done(0))).toEqual([]);
  expect(reviewPoints(four, done(1))).toHaveLength(1); // section 2 done is what counts
  const pts = reviewPoints(four, done(0, 1, 2, 3));
  expect(pts.map((p) => [p.id, p.afterSectionId])).toEqual([
    ['review-1', real[1].id],
    ['review-2', real[3].id],
  ]);
});

test('an odd trailing section has no review point', () => {
  expect(reviewPoints({ ...content, sections: real.slice(0, 3) }, done(0, 1, 2))).toHaveLength(1);
});

test('a review point never blocks the next lesson', () => {
  const s = lessonStates(four, done(0, 1));
  expect(s[lessonIds(2)[0]]).toBe('available');
});

// rng that cycles through fixed values for reproducible trials
const lcg = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const wordsOf = (steps: ReturnType<typeof reviewQuestions>) => steps.map((s) => ('word' in s ? s.word : ''));

test('produces 8 questions with unique ids', () => {
  const qs = reviewQuestions(content, real.map((s) => s.id), new Set(), lcg(1));
  expect(qs).toHaveLength(8);
  expect(new Set(qs.map((q) => q.id)).size).toBe(8);
});

test('older sections weigh more than newer ones', () => {
  const ids = real.map((s) => s.id);
  const first = new Set(real[0].lessons.flatMap((l) => l.steps).flatMap((s) => ('word' in s ? [s.word] : [])));
  const last = new Set(real[3].lessons.flatMap((l) => l.steps).flatMap((s) => ('word' in s ? [s.word] : [])));
  let old = 0;
  let recent = 0;
  const rng = lcg(7);
  for (let i = 0; i < 300; i++)
    for (const w of wordsOf(reviewQuestions(content, ids, new Set(), rng))) {
      if (first.has(w) && !last.has(w)) old++;
      if (last.has(w) && !first.has(w)) recent++;
    }
  expect(old).toBeGreaterThan(recent);
});

test('words with a pending mistake are picked more often', () => {
  const ids = real.map((s) => s.id);
  const w = real[3].lessons.flatMap((l) => l.steps).flatMap((s) => (s.type === 'present' && content.words[s.word].generates_card ? [s.word] : []))[0];
  const count = (mistakes: Set<string>) => {
    const rng = lcg(11);
    let n = 0;
    for (let i = 0; i < 300; i++) n += wordsOf(reviewQuestions(content, ids, mistakes, rng)).filter((x) => x === w).length;
    return n;
  };
  expect(count(new Set([w]))).toBeGreaterThan(count(new Set()));
});

test('completion is recorded only when recordReview is called, and is idempotent', async () => {
  const repo = new InMemoryProgressRepository();
  expect(await repo.completedReviews()).toEqual([]);
  await repo.recordReview('review-1');
  await repo.recordReview('review-1');
  expect(await repo.completedReviews()).toEqual(['review-1']);
});
