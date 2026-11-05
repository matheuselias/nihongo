import { and, asc, eq, sql } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import type { ProgressRepository } from './progress-repository';
import { lessonProgress, stepMistakes } from './schema';

export class SqliteProgressRepository implements ProgressRepository {
  constructor(private db: ExpoSQLiteDatabase) {}

  async getAll() {
    return this.db.select().from(lessonProgress);
  }

  async recordResult(lessonId: string, score: number, passed: boolean, now = new Date()) {
    await this.db
      .insert(lessonProgress)
      .values({ lessonId, bestScore: score, completed: passed, lastCompletedAt: passed ? now : null })
      .onConflictDoUpdate({
        target: lessonProgress.lessonId,
        set: {
          bestScore: sql`max(${lessonProgress.bestScore}, ${score})`,
          ...(passed && { completed: true, lastCompletedAt: now }),
        },
      });
  }

  async recordMistakes(lessonId: string, steps: { stepId: string; wordId?: string }[], now = new Date()) {
    if (!steps.length) return;
    await this.db
      .insert(stepMistakes)
      .values(steps.map((s) => ({ lessonId, stepId: s.stepId, wordId: s.wordId ?? null, createdAt: now })))
      .onConflictDoNothing();
  }

  async listMistakes(limit = -1) {
    return this.db.select().from(stepMistakes).orderBy(asc(stepMistakes.createdAt)).limit(limit);
  }

  async clearMistake(lessonId: string, stepId: string) {
    await this.db.delete(stepMistakes).where(and(eq(stepMistakes.lessonId, lessonId), eq(stepMistakes.stepId, stepId)));
  }
}
