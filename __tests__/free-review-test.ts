import { content } from '@/content';
import type { Word } from '@/content/schema';
import { generateQuestions, sectionQuestions } from '@/lesson/free-review';

const rng = () => 0.4;
const w = (id: string, t: string, extra: Partial<Word> = {}): Word =>
  ({ id, kana: id, romaji: id, translations: [t], generates_card: true, ...extra }) as Word;
const set = [w('a', 'um'), w('b', 'dois'), w('c', 'três'), w('d', 'quatro'), w('e', 'cinco')];

test('covers both directions and both types, with valid distractors', () => {
  const qs = generateQuestions(set, rng, 100);
  expect(qs).toHaveLength(set.length * 4);
  expect(new Set(qs.map((q) => q.type + (q as { direction: string }).direction)).size).toBe(4);
  for (const q of qs) {
    if (q.type !== 'multiple_choice') continue;
    expect(q.distractors).toHaveLength(3);
    expect(q.distractors).not.toContain(q.word);
    expect(new Set(q.distractors).size).toBe(3);
  }
  expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
});

test('count limits the questions', () => {
  expect(generateQuestions(set, rng)).toHaveLength(10);
});

test('grammar pieces generate nothing', () => {
  expect(generateQuestions([w('mo', 'também', { generates_card: false })], rng)).toEqual([]);
});

test('small sets use the distractors that exist, and drop multiple_choice with none', () => {
  const two = generateQuestions([w('a', 'um'), w('b', 'dois')], rng, 100);
  expect(two.filter((q) => q.type === 'multiple_choice').every((q) => q.type === 'multiple_choice' && q.distractors!.length === 1)).toBe(true);
  const one = generateQuestions([w('a', 'um')], rng, 100);
  expect(one.map((q) => q.type)).toEqual(['type_answer', 'type_answer']);
});

test('words sharing a translation are never distractors of each other', () => {
  const qs = generateQuestions([w('a', 'oi'), w('b', 'oi'), w('c', 'tchau')], rng, 100);
  for (const q of qs) if (q.type === 'multiple_choice' && q.word === 'a') expect(q.distractors).toEqual(['c']);
});

test('real section yields questions', () => {
  expect(sectionQuestions(content, content.sections[0].id, rng).length).toBeGreaterThan(0);
});
