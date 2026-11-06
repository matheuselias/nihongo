import { content } from '@/content';
import { GRADED_TYPES } from '@/content/schema';
import { InMemoryProgressRepository } from '@/db/progress-repository';
import { sectionQuestions } from '@/lesson/free-review';
import { LessonSession } from '@/lesson/session';
import { play } from '../test/play';
import { lessonStates } from '@/trail/rules';

const first = content.sections[0].lessons[0].id;
const rng = () => 0.3;

const graded = (id: string) => content.lessons[id].steps.filter((s) => GRADED_TYPES.includes(s.type));

test('perfect run passes and saves the lesson as completed', async () => {
  const repo = new InMemoryProgressRepository();
  const s = new LessonSession(content, first, rng);
  play(s);
  expect((await s.finish(repo))).toMatchObject({ score: 100, passed: true, wrongStepIds: [] });
  const done = new Set((await repo.getAll()).filter((p) => p.completed).map((p) => p.lessonId));
  expect(lessonStates(content, done)[first]).toBe('completed');
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

test('every lesson can be completed with every graded step type', async () => {
  for (const id of Object.keys(content.lessons)) {
    const repo = new InMemoryProgressRepository();
    const s = new LessonSession(content, id, rng);
    play(s);
    expect(await s.finish(repo)).toMatchObject({ score: 100, passed: true });
  }
});

test('situation, true_false and build_sentence: wrong answers count and are answered once', () => {
  const all = Object.values(content.lessons);
  for (const type of ['situation', 'true_false', 'build_sentence'] as const) {
    const lesson = all.find((l) => l.steps.some((st) => st.type === type))!;
    const wrong = lesson.steps.filter((st) => st.type === type).map((st) => st.id);
    const s = new LessonSession(content, lesson.id, rng);
    play(s, wrong);
    expect(s.result().wrongStepIds).toEqual(wrong);
  }
  const lesson = all.find((l) => l.steps.some((st) => st.type === 'build_sentence'))!;
  const s = new LessonSession(content, lesson.id, rng);
  play(s, [], 'build_sentence');
  const st = s.current as Extract<typeof s.current, { type: 'build_sentence' }>;
  expect([...s.blocks()].sort()).toEqual([...st.blocks].sort());
  expect(s.answerBlocks([...st.blocks].reverse())).toBe(false);
  expect(s.answerBlocks(st.blocks)).toBe(false);
  expect(() => s.next()).not.toThrow();
});

describe('mistakes queue', () => {
  const ids = (id: string) => graded(id).map((g) => g.id);

  test('failed lesson records wrong steps once, even when replayed', async () => {
    const repo = new InMemoryProgressRepository();
    for (let i = 0; i < 2; i++) {
      const s = new LessonSession(content, first, rng);
      play(s, ids(first));
      await s.finish(repo);
    }
    expect((await repo.listMistakes()).map((m) => m.stepId)).toEqual(ids(first));
  });

  test('leaving early records nothing', async () => {
    const repo = new InMemoryProgressRepository();
    play(new LessonSession(content, first, rng), ids(first), undefined);
    expect(await repo.listMistakes()).toEqual([]);
  });

  test('review: right clears, wrong keeps, redoing the lesson does not clear', async () => {
    const repo = new InMemoryProgressRepository();
    const [a, b] = ids(first);
    await repo.recordMistakes(first, [{ stepId: a }, { stepId: b }]);
    const redo = new LessonSession(content, first, rng);
    play(redo);
    await redo.finish(repo);
    expect(await repo.listMistakes()).toHaveLength(2);

    const picks = (await repo.listMistakes()).map((m) => ({ lessonId: m.lessonId, stepId: m.stepId }));
    const s = new LessonSession(content, first, rng, picks);
    play(s, [`${first}/${b}`]);
    await s.finish(repo);
    expect((await repo.listMistakes()).map((m) => m.stepId)).toEqual([b]);
  });

  test('batch is limited', async () => {
    const repo = new InMemoryProgressRepository();
    await repo.recordMistakes(first, Array.from({ length: 12 }, (_, i) => ({ stepId: `x${i}` })));
    expect(await repo.listMistakes(10)).toHaveLength(10);
  });
});

test('free review plays without saving anything', async () => {
  const repo = new InMemoryProgressRepository();
  const steps = sectionQuestions(content, content.sections[0].id, rng);
  const s = new LessonSession(content, first, rng, undefined, steps);
  play(s, [steps[0].id]);
  expect(await s.finish(repo)).toMatchObject({ wrongStepIds: [steps[0].id] });
  expect(await repo.getAll()).toEqual([]);
  expect(await repo.listMistakes()).toEqual([]);
});
