import type { Content } from '@/content/load';
import type { Step } from '@/content/schema';
import { generateQuestions } from '@/lesson/free-review';
import { sectionWordIds, type Rng } from '@/lesson/session';

export const REVIEW_QUESTIONS = 8;
const MISTAKE_WEIGHT = 3;
// Draw more words than questions so the 8 questions spread over several words.
const POOL_SIZE = 2 * REVIEW_QUESTIONS;

export function sectionWords(content: Content, sectionId: string) {
  const first = content.sections.find((s) => s.id === sectionId)!.lessons[0].id;
  return sectionWordIds(content, first).map((id) => content.words[id]);
}

/**
 * Picks review questions from the completed sections (in trail order). Older sections weigh more
 * (the oldest gets the count of completed sections, the newest 1) and words with a pending mistake x3.
 * Weighted sampling without replacement (key = rng^(1/weight)).
 */
export function reviewQuestions(
  content: Content,
  completedSectionIds: readonly string[],
  mistakeWordIds: ReadonlySet<string>,
  rng: Rng,
): Step[] {
  const weights = new Map<string, number>();
  completedSectionIds.forEach((sid, i) => {
    for (const w of sectionWords(content, sid)) {
      if (!w.generates_card) continue;
      const weight = (completedSectionIds.length - i) * (mistakeWordIds.has(w.id) ? MISTAKE_WEIGHT : 1);
      weights.set(w.id, Math.max(weights.get(w.id) ?? 0, weight));
    }
  });
  const picked = [...weights]
    .map(([id, weight]) => ({ id, key: rng() ** (1 / weight) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, POOL_SIZE)
    .map((x) => content.words[x.id]);
  return generateQuestions(picked, rng, REVIEW_QUESTIONS);
}
