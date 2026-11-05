import { z } from 'zod';

import {
  lessonSchema,
  sectionSchema,
  wordSchema,
  type Lesson,
  type Section,
  type Step,
  type Word,
} from './schema';

/** Raw shape wired by hand in content/index.ts (Metro cannot read folders at runtime). */
export type RawContent = {
  vocabulary: unknown[][];
  sections: { section: unknown; lessons: unknown[] }[];
};

export type LoadedSection = Omit<Section, 'lessons'> & { lessons: Lesson[] };
export type Content = { words: Record<string, Word>; sections: LoadedSection[]; lessons: Record<string, Lesson> };

function wordRefs(step: Step): string[] {
  switch (step.type) {
    case 'present':
      return [step.word];
    case 'rule':
      return step.words ?? [];
    case 'multiple_choice':
      return [step.word, ...(step.distractors ?? [])];
    case 'type_answer':
      return [step.word];
    default:
      return [];
  }
}

/** Validates everything and throws on the first problem. Word refs are guaranteed to exist in `words`. */
export function loadContent(raw: RawContent): Content {
  const words: Record<string, Word> = {};
  for (const w of z.array(wordSchema).parse(raw.vocabulary.flat())) {
    if (words[w.id]) throw new Error(`duplicate word id: ${w.id}`);
    words[w.id] = w;
  }

  const lessons: Record<string, Lesson> = {};
  const sections = raw.sections.map((r): LoadedSection => {
    const section = sectionSchema.parse(r.section);
    const own = z.array(lessonSchema).parse(r.lessons);
    if (own.length !== section.lessons.length)
      throw new Error(`${section.id}: lesson files do not match section.json`);
    const ordered = section.lessons.map((lessonId) => {
      const lesson = own.find((l) => l.id === lessonId);
      if (!lesson) throw new Error(`${section.id}: missing lesson ${lessonId}`);
      if (lessons[lesson.id]) throw new Error(`duplicate lesson id: ${lesson.id}`);
      lessons[lesson.id] = lesson;
      for (const step of lesson.steps)
        for (const ref of wordRefs(step))
          if (!words[ref]) throw new Error(`${lesson.id}/${step.id}: unknown word ${ref}`);
      return lesson;
    });
    return { ...section, lessons: ordered };
  });

  return { words, sections, lessons };
}
