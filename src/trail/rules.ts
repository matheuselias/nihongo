import type { Content } from '@/content/load';

export type LessonState = 'not_started' | 'completed';

/** Every lesson is open; the state only tells whether it was passed. */
export function lessonStates(content: Content, completed: ReadonlySet<string>): Record<string, LessonState> {
  const states: Record<string, LessonState> = {};
  for (const section of content.sections)
    for (const { id } of section.lessons) states[id] = completed.has(id) ? 'completed' : 'not_started';
  return states;
}

/** First lesson not completed in trail order, or undefined when everything is done. */
export function nextLessonId(content: Content, completed: ReadonlySet<string>): string | undefined {
  return content.sections.flatMap((s) => s.lessons).find((l) => !completed.has(l.id))?.id;
}

export type ReviewPoint = { id: string; afterSectionId: string; sectionIds: [string, string]; active: boolean };

/** Review point N always shows after section 2N; it is active once that section is completed. It never gates a lesson. */
export function reviewPoints(content: Content, completed: ReadonlySet<string>): ReviewPoint[] {
  const points: ReviewPoint[] = [];
  for (let n = 1; 2 * n <= content.sections.length; n++) {
    const [a, b] = content.sections.slice(2 * n - 2, 2 * n);
    points.push({ id: `review-${n}`, afterSectionId: b.id, sectionIds: [a.id, b.id], active: b.lessons.every((l) => completed.has(l.id)) });
  }
  return points;
}

/** Words a lesson introduces: `present` steps whose word no earlier lesson in trail order presented. */
export function newWordIds(content: Content, lessonId: string): string[] {
  const seen = new Set<string>();
  for (const lesson of content.sections.flatMap((s) => s.lessons)) {
    const own = lesson.steps.flatMap((st) => (st.type === 'present' ? [st.word] : []));
    if (lesson.id === lessonId) return [...new Set(own)].filter((w) => !seen.has(w));
    own.forEach((w) => seen.add(w));
  }
  return [];
}
