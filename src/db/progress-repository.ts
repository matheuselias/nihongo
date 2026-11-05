export type LessonProgress = {
  lessonId: string;
  bestScore: number;
  completed: boolean;
  lastCompletedAt: Date | null;
};

export type MistakeKey = { lessonId: string; stepId: string };
export type Mistake = MistakeKey & { wordId: string | null; createdAt: Date };

export interface ProgressRepository {
  getAll(): Promise<LessonProgress[]>;
  /** Keeps the best score; a pass marks the lesson completed for good. */
  recordResult(lessonId: string, score: number, passed: boolean, now?: Date): Promise<void>;
  /** One row per lesson/step: a repeated mistake keeps the existing row. */
  recordMistakes(lessonId: string, steps: { stepId: string; wordId?: string }[], now?: Date): Promise<void>;
  /** Oldest first. */
  listMistakes(limit?: number): Promise<Mistake[]>;
  clearMistake(lessonId: string, stepId: string): Promise<void>;
  /** Ids of the review points the person finished. */
  completedReviews(): Promise<string[]>;
  /** Idempotent: finishing again keeps the first date. */
  recordReview(reviewId: string, now?: Date): Promise<void>;
}

export class InMemoryProgressRepository implements ProgressRepository {
  private rows = new Map<string, LessonProgress>();

  async getAll() {
    return [...this.rows.values()];
  }

  async recordResult(lessonId: string, score: number, passed: boolean, now = new Date()) {
    const prev = this.rows.get(lessonId);
    this.rows.set(lessonId, {
      lessonId,
      bestScore: Math.max(prev?.bestScore ?? 0, score),
      completed: passed || (prev?.completed ?? false),
      lastCompletedAt: passed ? now : (prev?.lastCompletedAt ?? null),
    });
  }

  private mistakes = new Map<string, Mistake>();

  async recordMistakes(lessonId: string, steps: { stepId: string; wordId?: string }[], now = new Date()) {
    for (const { stepId, wordId } of steps) {
      const key = `${lessonId}/${stepId}`;
      if (!this.mistakes.has(key)) this.mistakes.set(key, { lessonId, stepId, wordId: wordId ?? null, createdAt: now });
    }
  }

  async listMistakes(limit?: number) {
    return [...this.mistakes.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).slice(0, limit);
  }

  async clearMistake(lessonId: string, stepId: string) {
    this.mistakes.delete(`${lessonId}/${stepId}`);
  }

  private reviews = new Map<string, Date>();

  async completedReviews() {
    return [...this.reviews.keys()];
  }

  async recordReview(reviewId: string, now = new Date()) {
    if (!this.reviews.has(reviewId)) this.reviews.set(reviewId, now);
  }
}
