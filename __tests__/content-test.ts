import { rawContent } from '../content';
import { loadContent, type RawContent } from '@/content/load';

const clone = (): RawContent => structuredClone(rawContent);
const firstLesson = (raw: RawContent) => raw.sections[0].lessons[0] as { steps: Record<string, unknown>[] };

describe('real content', () => {
  const content = loadContent(rawContent);

  test('loads and validates', () => {
    expect(content.sections.length).toBeGreaterThan(0);
  });

  test('every section has 3-8 lessons and every lesson 6-12 steps', () => {
    for (const s of content.sections) {
      expect(s.lessons.length).toBeGreaterThanOrEqual(3);
      expect(s.lessons.length).toBeLessThanOrEqual(8);
      for (const l of s.lessons) expect(l.steps.length).toBeGreaterThanOrEqual(6);
    }
  });

  test('fixed distractors never share a translation with the answer', () => {
    for (const l of Object.values(content.lessons))
      for (const s of l.steps)
        if (s.type === 'multiple_choice' && s.distractors)
          for (const d of s.distractors)
            expect(content.words[d].translations).not.toEqual(expect.arrayContaining(content.words[s.word].translations));
  });
});

describe('broken content is rejected', () => {
  test('unknown word id', () => {
    const raw = clone();
    firstLesson(raw).steps[0].word = 'nope';
    expect(() => loadContent(raw)).toThrow('unknown word');
  });

  test('step without id', () => {
    const raw = clone();
    delete firstLesson(raw).steps[0].id;
    expect(() => loadContent(raw)).toThrow();
  });

  test('duplicate step id', () => {
    const raw = clone();
    firstLesson(raw).steps[1].id = firstLesson(raw).steps[0].id;
    expect(() => loadContent(raw)).toThrow('duplicate step id');
  });

  test('empty romaji', () => {
    const raw = clone();
    (raw.vocabulary[0][0] as { romaji: string }).romaji = '';
    expect(() => loadContent(raw)).toThrow();
  });

  test('lesson without graded step', () => {
    const raw = clone();
    const l = firstLesson(raw);
    l.steps = l.steps.map((s, i) => ({ id: `s${i}`, type: 'present', word: 'ohayou' }));
    expect(() => loadContent(raw)).toThrow('graded');
  });
});
