import { sql } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import type { ProgressRepository } from './progress-repository';
import { lessonProgress } from './schema';

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
}
