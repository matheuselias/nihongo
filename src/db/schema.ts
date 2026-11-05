import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const lessonProgress = sqliteTable('lesson_progress', {
  lessonId: text('lesson_id').primaryKey(),
  bestScore: integer('best_score').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull(),
  lastCompletedAt: integer('last_completed_at', { mode: 'timestamp_ms' }),
});
