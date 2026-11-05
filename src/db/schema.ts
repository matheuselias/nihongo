import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
