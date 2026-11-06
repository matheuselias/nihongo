import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const lessonProgress = sqliteTable('lesson_progress', {
  lessonId: text('lesson_id').primaryKey(),
  bestScore: integer('best_score').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull(),
  lastCompletedAt: integer('last_completed_at', { mode: 'timestamp_ms' }),
});

export const stepMistakes = sqliteTable(
  'step_mistakes',
  {
    lessonId: text('lesson_id').notNull(),
    stepId: text('step_id').notNull(),
    wordId: text('word_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.lessonId, t.stepId] })],
);

export const reviewProgress = sqliteTable('review_progress', {
  reviewId: text('review_id').primaryKey(),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }).notNull(),
});

export const cardState = sqliteTable(
  'card_state',
  {
    wordId: text('word_id').notNull(),
    direction: text('direction', { enum: ['jp_to_pt', 'pt_to_jp'] }).notNull(),
    intervalDays: real('interval_days').notNull(),
    ease: real('ease').notNull(),
    dueAt: integer('due_at', { mode: 'timestamp_ms' }).notNull(),
    correctCount: integer('correct_count').notNull().default(0),
    wrongCount: integer('wrong_count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.wordId, t.direction] })],
);

export const studyDays = sqliteTable('study_days', {
  day: text('day').primaryKey(),
});
