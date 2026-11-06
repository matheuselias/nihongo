import { and, asc, count, eq, sql } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import type { CardDirection, ProgressRepository } from './progress-repository';
import { localDay } from './local-day';
import type { CardState } from '@/lesson/schedule';
import { cardState, lessonProgress, reviewProgress, stepMistakes, studyDays } from './schema';

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

  async completedReviews() {
    return (await this.db.select().from(reviewProgress)).map((r) => r.reviewId);
  }

  async recordReview(reviewId: string, now = new Date()) {
    await this.db.insert(reviewProgress).values({ reviewId, completedAt: now }).onConflictDoNothing();
  }

  async recordStudyDay(now = new Date()) {
    await this.db.insert(studyDays).values({ day: localDay(now) }).onConflictDoNothing();
  }

  async countStudyDays() {
    return (await this.db.select({ n: count() }).from(studyDays))[0].n;
  }

  async getCardStates() {
    return (await this.db.select().from(cardState)).map(({ dueAt, ...r }) => ({ ...r, due: dueAt }));
  }

  async saveCardResult(wordId: string, direction: CardDirection, state: CardState, correct: boolean) {
    const fields = { intervalDays: state.intervalDays, ease: state.ease, dueAt: state.due };
    await this.db
      .insert(cardState)
      .values({ wordId, direction, ...fields, correctCount: +correct, wrongCount: +!correct })
      .onConflictDoUpdate({
        target: [cardState.wordId, cardState.direction],
        set: {
          ...fields,
          correctCount: sql`${cardState.correctCount} + ${+correct}`,
          wrongCount: sql`${cardState.wrongCount} + ${+!correct}`,
        },
      });
  }
}
