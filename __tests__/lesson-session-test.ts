import { content } from '@/content';
import { InMemoryProgressRepository } from '@/db/progress-repository';
import { LessonSession } from '@/lesson/session';
import { lessonStates } from '@/trail/rules';

const first = content.sections[0].lessons[0].id;
const rng = () => 0.3;

/** Plays the lesson, answering graded steps right unless the step id is in `wrong`. */
function play(s: LessonSession, wrong: string[] = []) {
  while (!s.finished) {
    const q = s.question();
    if (q) s.answer(wrong.includes(s.current.id) ? (q.answer + 1) % 4 : q.answer);
    s.next();
  }
}

const graded = (id: string) => content.lessons[id].steps.filter((s) => s.type === 'multiple_choice');

test('perfect run passes, saves and unlocks the next lesson', async () => {
  const repo = new InMemoryProgressRepository();
  const s = new LessonSession(content, first, rng);
  play(s);
  expect((await s.finish(repo))).toMatchObject({ score: 100, passed: true, wrongStepIds: [] });
  const done = new Set((await repo.getAll()).filter((p) => p.completed).map((p) => p.lessonId));
  expect(lessonStates(content, done)[content.sections[0].lessons[1].id]).toBe('available');
});

test('failing run reports wrong steps and writes nothing', async () => {
  const repo = new InMemoryProgressRepository();
  const s = new LessonSession(content, first, rng);
  const ids = graded(first).map((g) => g.id);
  play(s, ids);
  const r = await s.finish(repo);
  expect(r).toMatchObject({ score: 0, passed: false, wrongStepIds: ids });
  expect(await repo.getAll()).toEqual([]);
});

test('a step is answered once', () => {
  const s = new LessonSession(content, first, rng);
  while (!s.question()) s.next();
  const q = s.question()!;
  expect(s.answer((q.answer + 1) % 4)).toBe(false);
  expect(s.answer(q.answer)).toBe(false);
  expect(() => new LessonSession(content, first, rng).next()).not.toThrow(); // explanatory step
});

test('a worse retry keeps completion and best score', async () => {
  const repo = new InMemoryProgressRepository();
  await repo.recordResult(first, 100, true);
  await repo.recordResult(first, 40, false);
  expect(await repo.getAll()).toMatchObject([{ bestScore: 100, completed: true }]);
});

test('options: 4 unique, one correct, no shared translation with the answer', () => {
  for (const lesson of Object.values(content.lessons))
    for (const step of graded(lesson.id)) {
      if (step.type !== 'multiple_choice' || step.distractors) continue;
      const s = new LessonSession(content, lesson.id, Math.random);
      const q = s.questionFor(step.id)!;
      expect(new Set(q.options.map((o) => o.id)).size).toBe(4);
      expect(q.options[q.answer].id).toBe(step.word);
      for (const o of q.options)
        if (o.id !== step.word) expect(o.translations.some((t) => q.prompt.translations.includes(t))).toBe(false);
    }
});

test('manual distractors are used as given', () => {
  const step = Object.values(content.lessons).flatMap((l) => l.steps.map((s) => [l.id, s] as const))
    .find(([, s]) => s.type === 'multiple_choice' && s.distractors);
  if (!step || step[1].type !== 'multiple_choice') return;
  const q = new LessonSession(content, step[0], rng).questionFor(step[1].id)!;
  expect(q.options.map((o) => o.id).sort()).toEqual([step[1].word, ...step[1].distractors!].sort());
});
