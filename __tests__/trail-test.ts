import { content } from '@/content';
import { InMemoryProgressRepository } from '@/db/progress-repository';
import { lessonStates } from '@/trail/rules';
import type { Content } from '@/content/load';

async function statesFor(repo: InMemoryProgressRepository, c: Content = content) {
  const done = new Set((await repo.getAll()).filter((p) => p.completed).map((p) => p.lessonId));
  return lessonStates(c, done);
}

const ids = content.sections[0].lessons.map((l) => l.id);

// Two-section fixture: the real content has one section only.
const two: Content = {
  ...content,
  sections: [
    { ...content.sections[0], lessons: content.sections[0].lessons.slice(0, 2) },
    { ...content.sections[0], id: 'next', lessons: [{ ...content.sections[0].lessons[2], id: 'next-a' }] },
  ],
};

test('initial state: only the first lesson is available', async () => {
  const s = await statesFor(new InMemoryProgressRepository());
  expect(ids.map((id) => s[id])).toEqual(['available', 'locked', 'locked', 'locked']);
});

test('completing a lesson unlocks the next one', async () => {
  const repo = new InMemoryProgressRepository();
  await repo.recordResult(ids[0], 100, true);
  const s = await statesFor(repo);
  expect(ids.map((id) => s[id])).toEqual(['completed', 'available', 'locked', 'locked']);
});

test('a failed attempt does not unlock', async () => {
  const repo = new InMemoryProgressRepository();
  await repo.recordResult(ids[0], 50, false);
  expect((await statesFor(repo))[ids[1]]).toBe('locked');
});

test('last lesson of a section unlocks the first of the next', async () => {
  const repo = new InMemoryProgressRepository();
  await repo.recordResult(ids[0], 90, true);
  expect((await statesFor(repo, two))['next-a']).toBe('locked');
  await repo.recordResult(ids[1], 90, true);
  expect((await statesFor(repo, two))['next-a']).toBe('available');
});

test('best score is preserved and completion is sticky', async () => {
  const repo = new InMemoryProgressRepository();
  await repo.recordResult(ids[0], 90, true);
  await repo.recordResult(ids[0], 60, false);
  const [row] = await repo.getAll();
  expect(row.bestScore).toBe(90);
  expect(row.completed).toBe(true);
});
