import type { Content } from '@/content/load';
import type { Mistake, ProgressRepository } from '@/db/progress-repository';

/** Pending mistakes whose lesson and step still exist in the content (oldest first). */
export async function validMistakes(repo: ProgressRepository, content: Content, limit?: number): Promise<Mistake[]> {
  const all = await repo.listMistakes();
  const ok = all.filter((m) => content.lessons[m.lessonId]?.steps.some((s) => s.id === m.stepId));
  return ok.slice(0, limit);
}
