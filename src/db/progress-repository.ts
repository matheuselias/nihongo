export type LessonProgress = {
  lessonId: string;
  bestScore: number;
  completed: boolean;
  lastCompletedAt: Date | null;
};

export interface ProgressRepository {
  getAll(): Promise<LessonProgress[]>;
  /** Keeps the best score; a pass marks the lesson completed for good. */
  recordResult(lessonId: string, score: number, passed: boolean, now?: Date): Promise<void>;
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
}
