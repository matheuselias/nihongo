import { z } from 'zod';

const text = z.string().trim().min(1);
const id = text;
const wordRef = id;

export const wordSchema = z.object({
  id,
  kana: text,
  kanji: text.optional(),
  romaji: text,
  translations: z.array(text).min(1),
  hint: text.optional(),
  note: text.optional(),
  generates_card: z.boolean(),
});

const jpLine = z.object({ jp: text, romaji: text, pt: text });

const step = <T extends string, S extends z.ZodRawShape>(type: T, shape: S) =>
  z.object({ id, type: z.literal(type), ...shape });

const direction = z.enum(['jp_to_pt', 'pt_to_jp']);

export const stepSchema = z.discriminatedUnion('type', [
  step('present', { word: wordRef }),
  step('rule', { title: text, body: text, words: z.array(wordRef).optional() }),
  step('examples', { title: text.optional(), items: z.array(jpLine.extend({ literal: text.optional() })).min(1) }),
  step('dialogue', { title: text.optional(), lines: z.array(jpLine.extend({ speaker: text })).min(2) }),
  step('multiple_choice', { word: wordRef, direction, distractors: z.array(wordRef).length(3).optional() }),
  step('type_answer', { word: wordRef, direction, accepted: z.array(text).optional() }),
  step('situation', {
    context: text,
    options: z.array(jpLine).min(2).max(4),
    answer: z.number().int().min(0),
    explanation: text,
  }),
  step('true_false', { statement: text, answer: z.boolean(), explanation: text }),
  step('build_sentence', { pt: text, blocks: z.array(text).min(2), romaji: text }),
]);

export type Word = z.infer<typeof wordSchema>;
export type Step = z.infer<typeof stepSchema>;
export type StepType = Step['type'];

export const GRADED_TYPES: StepType[] = ['multiple_choice', 'type_answer', 'situation', 'true_false', 'build_sentence'];

export const lessonSchema = z
  .object({
    id,
    title: text,
    pass_score: z.number().int().min(1).max(100).default(80),
    steps: z.array(stepSchema).min(6).max(12),
  })
  .superRefine((lesson, ctx) => {
    const ids = lesson.steps.map((s) => s.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'duplicate step id' });
    if (!lesson.steps.some((s) => GRADED_TYPES.includes(s.type)))
      ctx.addIssue({ code: 'custom', message: 'lesson needs at least one graded step' });
    lesson.steps.forEach((s) => {
      if (s.type === 'situation' && s.answer >= s.options.length)
        ctx.addIssue({ code: 'custom', message: `${s.id}: answer out of range` });
    });
  });

export type Lesson = z.infer<typeof lessonSchema>;

export const sectionSchema = z.object({
  id,
  title: text,
  description: text,
  lessons: z.array(id).min(3).max(8),
});

export type Section = z.infer<typeof sectionSchema>;
